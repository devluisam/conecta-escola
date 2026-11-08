-- =====================================================================
-- Testes automatizados das políticas de segurança (RLS).
-- Rodam num PostgreSQL com 00_supabase_shim.sql + migrations aplicadas.
-- Qualquer falha interrompe com erro. Ver README > "Testando o banco".
-- =====================================================================
\set ON_ERROR_STOP on
\set QUIET on

-- ---------- Dados mínimos (como superusuário) ----------
insert into auth.users (id, email) values
  ('a0000000-0000-0000-0000-000000000001', 'adm@teste'),
  ('b0000000-0000-0000-0000-000000000001', 'prof1@teste'),
  ('b0000000-0000-0000-0000-000000000002', 'prof2@teste'),
  ('c0000000-0000-0000-0000-000000000001', 'aluno1@teste'),
  ('c0000000-0000-0000-0000-000000000002', 'aluno2@teste');
insert into schools (id, name) values ('d0000000-0000-0000-0000-000000000001', 'Escola Teste');
insert into school_settings (school_id) values ('d0000000-0000-0000-0000-000000000001');
insert into profiles (id, school_id, role, name, email, matricula) values
  ('a0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'admin', 'Admin Teste', 'adm@teste', 'ADM1'),
  ('b0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'professor', 'Prof Um', 'prof1@teste', 'PROF1'),
  ('b0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'professor', 'Prof Dois', 'prof2@teste', 'PROF2'),
  ('c0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'aluno', 'Aluno Um', 'aluno1@teste', 'AL001'),
  ('c0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'aluno', 'Aluno Dois', 'aluno2@teste', 'AL002');
insert into classes (id, school_id, name, series, shift, year) values
  ('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'Turma A', '9º ano', 'Manhã', 2026),
  ('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000001', 'Turma B', '9º ano', 'Tarde', 2026);
insert into subjects (id, name, code) values ('f0000000-0000-0000-0000-000000000001', 'Matemática', 'MAT');
insert into enrollments (student_id, class_id) values
  ('c0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001'),
  ('c0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002');
insert into teaching_assignments (teacher_id, class_id, subject_id) values
  ('b0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001'),
  ('b0000000-0000-0000-0000-000000000002', 'e0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001');
insert into activities (id, title, type, subject_id, class_id, teacher_id, due_at, max_score, status) values
  ('11000000-0000-0000-0000-000000000001', 'Atividade A', 'tarefa', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', now() + interval '3 days', 10, 'publicada'),
  ('11000000-0000-0000-0000-000000000002', 'Rascunho A', 'tarefa', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', now() + interval '3 days', 10, 'rascunho'),
  ('11000000-0000-0000-0000-000000000003', 'Atividade B', 'tarefa', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', now() + interval '3 days', 10, 'publicada');
insert into grades (student_id, subject_id, class_id, teacher_id, term, label, score) values
  ('c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 'Prova 1', 8),
  ('c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', 1, 'Prova 1', 6);
insert into challenges (id, title, category, kind, points, ends_at, class_id, questions, answer_key, created_by) values
  ('12000000-0000-0000-0000-000000000001', 'Quiz A', 'quiz', 'quiz', 50, now() + interval '7 days', 'e0000000-0000-0000-0000-000000000001',
   '[{"prompt":"2+2?","options":["3","4"]},{"prompt":"3x3?","options":["9","6"]}]', '{1,0}', 'b0000000-0000-0000-0000-000000000001');

do $$ begin
  assert (select raw_app_meta_data->>'role' from auth.users where id = 'c0000000-0000-0000-0000-000000000001') = 'aluno', 'role não sincronizado no app_metadata';
  raise notice 'OK  perfil → app_metadata.role sincronizado';
end $$;

-- ---------- Aluno 1 (Turma A) ----------
set role authenticated;
select set_config('request.jwt.claim.sub', 'c0000000-0000-0000-0000-000000000001', false) \g /dev/null
do $$ begin
  assert (select count(*) from activities) = 1, 'aluno deveria ver só a atividade publicada da própria turma';
  assert (select count(*) from grades) = 1, 'aluno deveria ver só as próprias notas';
  assert (select count(*) from profiles where role = 'aluno') = 1, 'aluno não deve ver dados de outros alunos';
  assert (select count(*) from profiles where role = 'professor') = 2, 'aluno vê a equipe da escola';
  raise notice 'OK  aluno vê apenas os próprios dados e a própria turma';
  begin
    insert into grades (student_id, subject_id, class_id, teacher_id, term, label, score)
    values ('c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1, 'Forjada', 10);
    raise exception 'FALHOU: aluno conseguiu lançar nota';
  exception when insufficient_privilege then raise notice 'OK  aluno não lança notas';
  end;
  begin
    update profiles set role = 'admin' where id = 'c0000000-0000-0000-0000-000000000001';
    raise exception 'FALHOU: aluno alterou o próprio perfil de acesso';
  exception when insufficient_privilege then raise notice 'OK  aluno não altera campos cadastrais';
  end;
  update profiles set bio = 'Gosto de matemática' where id = 'c0000000-0000-0000-0000-000000000001';
  raise notice 'OK  aluno edita dados pessoais permitidos';
  begin
    perform answer_key from challenges;
    raise exception 'FALHOU: gabarito visível ao aluno';
  exception when insufficient_privilege then raise notice 'OK  gabarito do quiz é inacessível';
  end;
  begin
    insert into point_entries (student_id, points, reason) values ('c0000000-0000-0000-0000-000000000001', 9999, 'hack');
    raise exception 'FALHOU: aluno inseriu pontos';
  exception when insufficient_privilege then raise notice 'OK  pontos só via RPC';
  end;
  insert into submissions (activity_id, student_id, text) values ('11000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 'resposta');
  raise notice 'OK  aluno entrega atividade da própria turma';
  begin
    insert into submissions (activity_id, student_id, text) values ('11000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001', 'x');
    raise exception 'FALHOU: aluno entregou atividade de outra turma';
  exception when insufficient_privilege then raise notice 'OK  aluno não entrega atividade de outra turma';
  end;
  begin
    perform public.start_conversation('c0000000-0000-0000-0000-000000000002');
    raise exception 'FALHOU: aluno iniciou conversa com aluno de outra turma';
  exception when insufficient_privilege then raise notice 'OK  conversas restritas aos vínculos';
  end;
  perform public.start_conversation('b0000000-0000-0000-0000-000000000001');
  raise notice 'OK  aluno conversa com o próprio professor';
  assert (select (public.submit_quiz('12000000-0000-0000-0000-000000000001', '{1,1}'))->>'pointsAwarded') = '50', 'quiz deveria premiar participação';
  assert (select (public.submit_quiz('12000000-0000-0000-0000-000000000001', '{1,0}'))->>'pointsAwarded') = '0', 'pontos não podem ser concedidos duas vezes';
  assert (select sum(points) from point_entries) = 50, 'extrato de pontos incorreto';
  raise notice 'OK  quiz premia uma única vez, pela participação';
end $$;
reset role;

-- ---------- Professor 1 (Turma A) ----------
set role authenticated;
select set_config('request.jwt.claim.sub', 'b0000000-0000-0000-0000-000000000001', false) \g /dev/null
do $$ begin
  assert (select count(*) from activities) = 2, 'professor deveria ver só as atividades da própria turma (inclui rascunho)';
  assert (select count(*) from grades) = 1, 'professor deveria ver só as notas das suas turmas';
  assert (select count(*) from profiles where role = 'aluno') = 1, 'professor vê só os alunos das suas turmas';
  assert (select count(*) from submissions) = 1, 'professor deveria ver a entrega da sua turma';
  raise notice 'OK  professor acessa apenas as turmas sob sua responsabilidade';
  update submissions set score = 9, status = 'corrigida', graded_at = now() where activity_id = '11000000-0000-0000-0000-000000000001';
  insert into grades (student_id, subject_id, class_id, teacher_id, term, label, score)
  values ('c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 1, 'Prova 2', 9);
  raise notice 'OK  professor corrige e lança notas da própria turma';
  begin
    insert into grades (student_id, subject_id, class_id, teacher_id, term, label, score)
    values ('c0000000-0000-0000-0000-000000000002', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', 1, 'Prova 2', 9);
    raise exception 'FALHOU: professor lançou nota em turma que não leciona';
  exception when insufficient_privilege then raise notice 'OK  professor não lança nota em outra turma';
  end;
  begin
    insert into activities (title, type, subject_id, class_id, teacher_id, due_at, max_score)
    values ('Invasão', 'tarefa', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000001', now(), 10);
    raise exception 'FALHOU: professor criou atividade em outra turma';
  exception when insufficient_privilege then raise notice 'OK  professor não cria atividade em outra turma';
  end;
end $$;
reset role;

-- ---------- Notificações geradas pelo banco ----------
do $$ begin
  assert (select count(*) from notifications where user_id = 'c0000000-0000-0000-0000-000000000001' and kind = 'nota') >= 2, 'aluno deveria ser notificado da correção e da nota';
  assert (select count(*) from notifications where user_id = 'b0000000-0000-0000-0000-000000000001' and kind = 'tarefa') >= 1, 'professor deveria ser notificado da entrega';
  raise notice 'OK  notificações automáticas (entrega, correção, nota)';
end $$;

-- ---------- Admin ----------
set role authenticated;
select set_config('request.jwt.claim.sub', 'a0000000-0000-0000-0000-000000000001', false) \g /dev/null
do $$ begin
  assert (select count(*) from activities) = 3, 'admin vê todas as atividades';
  assert (select count(*) from profiles) = 5, 'admin vê todos os perfis';
  begin
    insert into grades (student_id, subject_id, class_id, teacher_id, term, label, score)
    values ('c0000000-0000-0000-0000-000000000001', 'f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 1, 'Admin', 10);
    raise exception 'FALHOU: admin lançou nota';
  exception when insufficient_privilege then raise notice 'OK  admin gerencia a escola, mas não altera notas (menor privilégio)';
  end;
  update school_settings set passing_grade = 5;
  raise notice 'OK  admin altera configurações';
end $$;
reset role;

\echo '== Todos os testes de RLS passaram =='
