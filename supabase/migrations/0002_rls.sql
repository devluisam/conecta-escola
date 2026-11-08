-- =====================================================================
-- Conecta Escola — segurança por perfil (Row Level Security)
-- Princípios: aluno vê só os próprios dados; professor só as turmas/
-- disciplinas que leciona; administração gerencia a escola.
-- =====================================================================

-- ---------- Funções auxiliares (security definer evita recursão de RLS) ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and active
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.my_role() = 'admin', false)
$$;

create or replace function public.my_school() returns uuid
language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid() and active
$$;

create or replace function public.student_class(p_student uuid) returns uuid
language sql stable security definer set search_path = public as $$
  select class_id from public.enrollments where student_id = p_student and status = 'ativa'
$$;

create or replace function public.teaches(p_class uuid, p_subject uuid default null) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.teaching_assignments
    where teacher_id = auth.uid() and class_id = p_class and (p_subject is null or subject_id = p_subject)
  ) and public.my_role() = 'professor'
$$;

create or replace function public.teaches_subject(p_subject uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teaching_assignments where teacher_id = auth.uid() and subject_id = p_subject)
    and public.my_role() = 'professor'
$$;

create or replace function public.teaches_student(p_student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.teaches(public.student_class(p_student))
$$;

-- Turmas visíveis para o usuário logado (aluno: a sua; professor: as que leciona).
create or replace function public.my_classes() returns setof uuid
language sql stable security definer set search_path = public as $$
  select public.student_class(auth.uid()) where public.my_role() = 'aluno'
  union
  select class_id from public.teaching_assignments where teacher_id = auth.uid() and public.my_role() = 'professor'
  union
  select id from public.classes where public.is_admin()
$$;

create or replace function public.same_school(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = p_user and school_id = public.my_school())
$$;

-- Há vínculo escolar que permita conversar? (regra de comunicação)
create or replace function public.can_contact(p_other uuid) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  me text := public.my_role();
  other public.profiles;
  allow_s2s boolean;
begin
  select * into other from public.profiles where id = p_other and active;
  if other.id is null or other.id = auth.uid() or me is null then return false; end if;
  if me = 'admin' or other.role = 'admin' then return true; end if;
  if me = 'professor' then
    return other.role = 'professor' or public.teaches_student(p_other);
  end if;
  -- aluno
  if other.role = 'professor' then
    return exists (select 1 from public.teaching_assignments
                   where teacher_id = p_other and class_id = public.student_class(auth.uid()));
  end if;
  select allow_student_to_student_messages into allow_s2s from public.school_settings where school_id = public.my_school();
  return coalesce(allow_s2s, false) and public.student_class(p_other) = public.student_class(auth.uid());
end $$;

-- ---------- Habilita RLS em todas as tabelas ----------
alter table public.schools enable row level security;
alter table public.school_settings enable row level security;
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.subjects enable row level security;
alter table public.enrollments enable row level security;
alter table public.teaching_assignments enable row level security;
alter table public.activities enable row level security;
alter table public.submissions enable row level security;
alter table public.grades enable row level security;
alter table public.events enable row level security;
alter table public.materials enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.announcements enable row level security;
alter table public.notifications enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_participations enable row level security;
alter table public.point_entries enable row level security;

-- ---------- Escola, configurações e cadastros básicos ----------
create policy "escola: membros leem" on public.schools for select using (id = public.my_school());
create policy "config: membros leem" on public.school_settings for select using (school_id = public.my_school());
create policy "config: admin altera" on public.school_settings for update using (public.is_admin()) with check (public.is_admin());

create policy "disciplinas: autenticados leem" on public.subjects for select using (auth.uid() is not null);
create policy "disciplinas: admin gerencia" on public.subjects for all using (public.is_admin()) with check (public.is_admin());

create policy "turmas: visíveis" on public.classes for select using (id in (select public.my_classes()));
create policy "turmas: admin gerencia" on public.classes for all using (public.is_admin()) with check (public.is_admin());

create policy "vínculos: visíveis" on public.teaching_assignments for select
  using (public.is_admin() or teacher_id = auth.uid() or class_id = public.student_class(auth.uid()));
create policy "vínculos: admin gerencia" on public.teaching_assignments for all using (public.is_admin()) with check (public.is_admin());

create policy "matrículas: visíveis" on public.enrollments for select
  using (student_id = auth.uid() or public.is_admin() or public.teaches(class_id));
create policy "matrículas: admin gerencia" on public.enrollments for all using (public.is_admin()) with check (public.is_admin());

-- ---------- Perfis ----------
-- Equipe (professores/gestão) da escola é visível a todos da escola; alunos só a si,
-- aos seus professores e à gestão. Dados de menores não ficam expostos a colegas.
create policy "perfis: leitura" on public.profiles for select using (
  id = auth.uid()
  or public.is_admin()
  or (school_id = public.my_school() and role in ('professor', 'admin'))
  or (role = 'aluno' and public.teaches_student(id))
);
create policy "perfis: próprio usuário edita" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());
create policy "perfis: admin gerencia" on public.profiles for all using (public.is_admin()) with check (public.is_admin());

-- Impede que o próprio usuário altere campos cadastrais/sensíveis.
create or replace function public.guard_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if public.is_admin() or auth.uid() is null then return new; end if;
  if new.role is distinct from old.role or new.matricula is distinct from old.matricula
     or new.email is distinct from old.email or new.active is distinct from old.active
     or new.school_id is distinct from old.school_id or new.guardian_name is distinct from old.guardian_name
     or new.birth_date is distinct from old.birth_date
     or (old.role = 'aluno' and new.name is distinct from old.name) then
    raise exception 'Campo cadastral só pode ser alterado pela secretaria.' using errcode = '42501';
  end if;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_update();

-- ---------- Atividades e entregas ----------
create policy "atividades: leitura" on public.activities for select using (
  public.is_admin()
  or teacher_id = auth.uid()
  or public.teaches(class_id, subject_id)
  or (status = 'publicada' and class_id = public.student_class(auth.uid()))
);
create policy "atividades: professor da turma ou admin escreve" on public.activities for all
  using (public.is_admin() or public.teaches(class_id, subject_id))
  with check (public.is_admin() or public.teaches(class_id, subject_id));

create policy "entregas: leitura" on public.submissions for select using (
  student_id = auth.uid()
  or public.is_admin()
  or exists (select 1 from public.activities a where a.id = activity_id and public.teaches(a.class_id, a.subject_id))
);
create policy "entregas: aluno envia a própria" on public.submissions for insert with check (
  student_id = auth.uid() and status = 'entregue' and score is null
  and exists (select 1 from public.activities a where a.id = activity_id and a.status = 'publicada'
              and a.class_id = public.student_class(auth.uid()))
);
create policy "entregas: aluno edita antes da correção" on public.submissions for update
  using (student_id = auth.uid() and status = 'entregue')
  with check (student_id = auth.uid() and status = 'entregue' and score is null);
create policy "entregas: professor corrige" on public.submissions for update using (
  public.is_admin() or exists (select 1 from public.activities a where a.id = activity_id and public.teaches(a.class_id, a.subject_id))
);

-- ---------- Notas (somente o professor da disciplina escreve) ----------
create policy "notas: leitura" on public.grades for select
  using (student_id = auth.uid() or public.is_admin() or public.teaches(class_id, subject_id));
create policy "notas: professor da disciplina escreve" on public.grades for all
  using (public.teaches(class_id, subject_id))
  with check (public.teaches(class_id, subject_id) and teacher_id = auth.uid() and public.student_class(student_id) = class_id);

-- ---------- Agenda ----------
create policy "agenda: leitura" on public.events for select
  using ((class_id is null and public.same_school(created_by)) or class_id in (select public.my_classes()));
create policy "agenda: admin gerencia" on public.events for all using (public.is_admin()) with check (public.is_admin());
create policy "agenda: professor nas suas turmas" on public.events for all
  using (created_by = auth.uid() and public.teaches(class_id))
  with check (created_by = auth.uid() and public.teaches(class_id));

-- ---------- Biblioteca ----------
create policy "materiais: leitura" on public.materials for select using (
  public.is_admin()
  or uploaded_by = auth.uid()
  or (class_id is not null and class_id in (select public.my_classes()))
  or (class_id is null and (public.teaches_subject(subject_id) or exists (
        select 1 from public.teaching_assignments t where t.subject_id = materials.subject_id and t.class_id = public.student_class(auth.uid()))))
);
create policy "materiais: professor da disciplina ou admin publica" on public.materials for insert with check (
  uploaded_by = auth.uid() and (public.is_admin() or (case when class_id is null then public.teaches_subject(subject_id) else public.teaches(class_id, subject_id) end))
);
create policy "materiais: autor ou admin remove" on public.materials for delete using (uploaded_by = auth.uid() or public.is_admin());

-- ---------- Conversas e mensagens ----------
create policy "conversas: participantes" on public.conversations for select using (auth.uid() in (participant_a, participant_b));
create policy "conversas: iniciar com vínculo" on public.conversations for insert with check (
  auth.uid() in (participant_a, participant_b)
  and public.can_contact(case when participant_a = auth.uid() then participant_b else participant_a end)
);
create policy "mensagens: participantes leem" on public.messages for select using (
  exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b))
);
create policy "mensagens: participante envia com vínculo ativo" on public.messages for insert with check (
  sender_id = auth.uid() and exists (
    select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b)
      and public.can_contact(case when c.participant_a = auth.uid() then c.participant_b else c.participant_a end))
);
create policy "mensagens: destinatário marca como lida" on public.messages for update using (
  sender_id <> auth.uid() and exists (select 1 from public.conversations c where c.id = conversation_id and auth.uid() in (c.participant_a, c.participant_b))
);

-- ---------- Avisos e notificações ----------
create policy "avisos: leitura por público" on public.announcements for select using (
  public.is_admin() or author_id = auth.uid() or (
    (class_id is null or class_id in (select public.my_classes()))
    and (audience = 'todos'
         or (audience = 'alunos' and public.my_role() = 'aluno')
         or (audience = 'professores' and public.my_role() = 'professor')
         or (class_id is not null and public.my_role() = 'professor'))
  )
);
create policy "avisos: admin publica" on public.announcements for insert with check (public.is_admin() and author_id = auth.uid());
create policy "avisos: professor publica para suas turmas" on public.announcements for insert
  with check (author_id = auth.uid() and audience = 'alunos' and class_id is not null and public.teaches(class_id));
create policy "avisos: autor ou admin remove" on public.announcements for delete using (author_id = auth.uid() or public.is_admin());

create policy "notificações: dono lê" on public.notifications for select using (user_id = auth.uid());
create policy "notificações: dono marca lida" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Inserção apenas por triggers/funções security definer (ver 0003_functions.sql).

-- ---------- Desafios ----------
create policy "desafios: leitura" on public.challenges for select
  using (class_id is null or class_id in (select public.my_classes()) or created_by = auth.uid());
create policy "desafios: admin gerencia" on public.challenges for all using (public.is_admin()) with check (public.is_admin());
create policy "desafios: professor cria para suas turmas" on public.challenges for insert
  with check (created_by = auth.uid() and class_id is not null and public.teaches(class_id));

create policy "participações: leitura" on public.challenge_participations for select
  using (student_id = auth.uid() or public.is_admin() or public.teaches_student(student_id));
create policy "pontos: leitura" on public.point_entries for select
  using (student_id = auth.uid() or public.is_admin() or public.teaches_student(student_id));
-- Participações e pontos só mudam pelas RPCs (evita "pontos forjados").

-- O gabarito nunca vai para o navegador: leitura concedida coluna a coluna, sem answer_key.
revoke select on public.challenges from anon, authenticated;
grant select (id, title, description, category, kind, points, starts_at, ends_at, class_id, subject_id, questions, steps, featured, created_by)
  on public.challenges to authenticated;
