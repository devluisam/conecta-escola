-- =====================================================================
-- Conecta Escola — funções, gatilhos e RPCs
-- =====================================================================

-- ---------- Perfil → app_metadata.role (lido pelo proxy do Next.js) ----------
create or replace function public.sync_role_claim() returns trigger
language plpgsql security definer set search_path = public, auth as $$
begin
  update auth.users
     set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                             || jsonb_build_object('role', case when new.active then new.role else null end)
   where id = new.id;
  return new;
end $$;
create trigger profiles_sync_role after insert or update of role, active on public.profiles
  for each row execute function public.sync_role_claim();

-- ---------- Login por matrícula ----------
-- Converte matrícula em e-mail para o signInWithPassword. Retorna null se não existir.
-- Obs.: permite descobrir o e-mail de uma matrícula; em produção, prefira e-mails
-- institucionais e limite de requisições (rate limit) no Supabase.
create or replace function public.login_email(p_identifier text) returns text
language sql stable security definer set search_path = public as $$
  select email from public.profiles where lower(matricula) = lower(trim(p_identifier)) and active limit 1
$$;
grant execute on function public.login_email(text) to anon, authenticated;

-- ---------- Notificações (somente via servidor) ----------
create or replace function public.notify(p_users uuid[], p_kind text, p_title text, p_body text, p_href text)
returns void language sql security definer set search_path = public as $$
  insert into public.notifications (user_id, kind, title, body, href)
  select distinct u, p_kind, p_title, left(p_body, 140), p_href from unnest(p_users) u where u is not null
$$;
revoke execute on function public.notify(uuid[], text, text, text, text) from public, anon, authenticated;

create or replace function public.class_students(p_class uuid) returns uuid[]
language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(e.student_id), '{}') from public.enrollments e
  join public.profiles p on p.id = e.student_id and p.active
  where e.class_id = p_class and e.status = 'ativa'
$$;
revoke execute on function public.class_students(uuid) from public, anon, authenticated;

create or replace function public.on_activity_published() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'publicada' and (tg_op = 'INSERT' or old.status <> 'publicada') then
    perform public.notify(public.class_students(new.class_id), 'tarefa', 'Nova atividade', new.title, '/aluno/tarefas/' || new.id);
  end if;
  return new;
end $$;
create trigger activities_notify after insert or update of status on public.activities
  for each row execute function public.on_activity_published();

create or replace function public.on_submission_change() returns trigger
language plpgsql security definer set search_path = public as $$
declare a public.activities;
begin
  select * into a from public.activities where id = new.activity_id;
  if tg_op = 'INSERT' then
    perform public.notify(array[a.teacher_id], 'tarefa', 'Nova entrega', a.title, '/professor/atividades/' || a.id);
  elsif new.status = 'corrigida' and new.score is distinct from old.score then
    perform public.notify(array[new.student_id], 'nota', 'Atividade corrigida', a.title, '/aluno/tarefas/' || a.id);
  end if;
  return new;
end $$;
create trigger submissions_notify after insert or update on public.submissions
  for each row execute function public.on_submission_change();

create or replace function public.on_grade_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.notify(array[new.student_id], 'nota', 'Nova nota lançada', new.label, '/aluno/notas');
  return new;
end $$;
create trigger grades_notify after insert on public.grades for each row execute function public.on_grade_insert();

create or replace function public.on_message_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare c public.conversations; other uuid; other_role text; sender_name text;
begin
  update public.conversations set updated_at = new.created_at where id = new.conversation_id returning * into c;
  other := case when c.participant_a = new.sender_id then c.participant_b else c.participant_a end;
  select role into other_role from public.profiles where id = other;
  select name into sender_name from public.profiles where id = new.sender_id;
  perform public.notify(array[other], 'mensagem', 'Nova mensagem de ' || sender_name, new.body, '/' || other_role || '/comunicacao?c=' || c.id);
  return new;
end $$;
create trigger messages_notify after insert on public.messages for each row execute function public.on_message_insert();

create or replace function public.on_announcement_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare targets uuid[];
begin
  if new.class_id is not null then targets := public.class_students(new.class_id);
  else
    select coalesce(array_agg(id), '{}') into targets from public.profiles p
     where p.active and p.school_id = (select school_id from public.profiles where id = new.author_id)
       and ((new.audience = 'todos' and p.role <> 'admin') or (new.audience = 'alunos' and p.role = 'aluno')
            or (new.audience = 'professores' and p.role = 'professor'));
  end if;
  perform public.notify(targets, 'aviso', new.title, new.body, null);
  return new;
end $$;
create trigger announcements_notify after insert on public.announcements for each row execute function public.on_announcement_insert();

-- ---------- Conversas ----------
create or replace function public.start_conversation(p_other uuid) returns uuid
language plpgsql security definer set search_path = public as $$
declare a uuid := least(auth.uid(), p_other); b uuid := greatest(auth.uid(), p_other); cid uuid;
begin
  if not public.can_contact(p_other) then
    raise exception 'Você só pode conversar com pessoas da sua comunidade escolar.' using errcode = '42501';
  end if;
  select id into cid from public.conversations where participant_a = a and participant_b = b;
  if cid is null then
    insert into public.conversations (participant_a, participant_b) values (a, b) returning id into cid;
  end if;
  return cid;
end $$;
grant execute on function public.start_conversation(uuid) to authenticated;

-- ---------- Gamificação (pontuação calculada no servidor) ----------
create or replace function public.participation_for(p_challenge uuid) returns public.challenge_participations
language plpgsql security definer set search_path = public as $$
declare c public.challenges; p public.challenge_participations;
begin
  if public.my_role() <> 'aluno' then raise exception 'Apenas alunos participam de desafios.' using errcode = '42501'; end if;
  select * into c from public.challenges where id = p_challenge
    and (class_id is null or class_id = public.student_class(auth.uid()));
  if c.id is null then raise exception 'Desafio não encontrado.' using errcode = 'P0002'; end if;
  if now() > c.ends_at then raise exception 'Este desafio já foi encerrado.'; end if;
  if now() < c.starts_at then raise exception 'Este desafio ainda não começou.'; end if;
  insert into public.challenge_participations (challenge_id, student_id) values (c.id, auth.uid())
    on conflict (challenge_id, student_id) do nothing;
  select * into p from public.challenge_participations where challenge_id = c.id and student_id = auth.uid();
  return p;
end $$;
revoke execute on function public.participation_for(uuid) from public, anon, authenticated;

create or replace function public.award_challenge(p_part uuid) returns int
language plpgsql security definer set search_path = public as $$
declare p public.challenge_participations; c public.challenges;
begin
  select * into p from public.challenge_participations where id = p_part for update;
  if p.points_awarded > 0 then return 0; end if;
  select * into c from public.challenges where id = p.challenge_id;
  update public.challenge_participations set points_awarded = c.points, status = 'concluido', completed_at = now() where id = p.id;
  insert into public.point_entries (student_id, points, reason, challenge_id) values (p.student_id, c.points, 'Desafio concluído: ' || c.title, c.id);
  perform public.notify(array[p.student_id], 'desafio', 'Desafio concluído!', 'Você ganhou ' || c.points || ' pontos em "' || c.title || '".', '/aluno/desafios');
  return c.points;
end $$;
revoke execute on function public.award_challenge(uuid) from public, anon, authenticated;

create or replace function public.join_challenge(p_challenge uuid) returns public.challenge_participations
language sql security definer set search_path = public as $$ select public.participation_for(p_challenge) $$;
grant execute on function public.join_challenge(uuid) to authenticated;

create or replace function public.toggle_challenge_step(p_challenge uuid, p_step int) returns public.challenge_participations
language plpgsql security definer set search_path = public as $$
declare p public.challenge_participations; total int;
begin
  p := public.participation_for(p_challenge);
  select jsonb_array_length(steps) into total from public.challenges where id = p_challenge and kind = 'checklist';
  if total is null or p_step < 0 or p_step >= total then raise exception 'Etapa inválida.'; end if;
  if p.status = 'concluido' then return p; end if;
  update public.challenge_participations
     set completed_steps = case when p_step = any(completed_steps) then array_remove(completed_steps, p_step)
                                else array(select unnest(completed_steps || p_step) order by 1) end
   where id = p.id returning * into p;
  if cardinality(p.completed_steps) = total then
    perform public.award_challenge(p.id);
    select * into p from public.challenge_participations where id = p.id;
  end if;
  return p;
end $$;
grant execute on function public.toggle_challenge_step(uuid, int) to authenticated;

-- Os pontos premiam a participação completa — não o acerto.
create or replace function public.submit_quiz(p_challenge uuid, p_answers int[]) returns jsonb
language plpgsql security definer set search_path = public as $$
declare p public.challenge_participations; key int[]; correct int := 0; awarded int;
begin
  p := public.participation_for(p_challenge);
  select answer_key into key from public.challenges where id = p_challenge and kind = 'quiz';
  if key is null or cardinality(p_answers) <> cardinality(key) then raise exception 'Responda todas as perguntas.'; end if;
  for i in 1..cardinality(key) loop
    if p_answers[i] = key[i] then correct := correct + 1; end if;
  end loop;
  update public.challenge_participations
     set attempts = attempts + 1, best_score = greatest(coalesce(best_score, 0), correct::numeric / cardinality(key))
   where id = p.id;
  awarded := public.award_challenge(p.id);
  return jsonb_build_object('correct', correct, 'total', cardinality(key), 'pointsAwarded', awarded, 'answerKey', to_jsonb(key));
end $$;
grant execute on function public.submit_quiz(uuid, int[]) to authenticated;

-- Soma de pontos da turma (meta coletiva) sem expor alunos individualmente.
create or replace function public.class_points_total() returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(pe.points), 0)::int from public.point_entries pe
  join public.enrollments e on e.student_id = pe.student_id and e.status = 'ativa'
  where e.class_id = public.student_class(auth.uid())
$$;
grant execute on function public.class_points_total() to authenticated;

-- ---------- Storage: bucket privado para anexos ----------
insert into storage.buckets (id, name, public) values ('arquivos', 'arquivos', false) on conflict (id) do nothing;
-- Cada usuário envia apenas para a própria pasta: arquivos/<uid>/...
create policy "arquivos: upload na própria pasta" on storage.objects for insert to authenticated
  with check (bucket_id = 'arquivos' and (storage.foldername(name))[1] = auth.uid()::text);
-- Leitura liberada a autenticados que conhecem o caminho; o caminho só chega a quem tem
-- acesso ao registro (atividade, entrega ou material) pelas políticas acima.
create policy "arquivos: leitura autenticada" on storage.objects for select to authenticated using (bucket_id = 'arquivos');
