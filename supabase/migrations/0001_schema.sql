-- =====================================================================
-- Conecta Escola — esquema do banco (PostgreSQL / Supabase)
-- Nomes em snake_case; o front-end converte para camelCase.
-- Senhas NÃO ficam aqui: são gerenciadas pelo Supabase Auth (auth.users).
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Escolas e configurações ----------
create table public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text not null default '',
  inep text not null default '',
  created_at timestamptz not null default now()
);

create table public.school_settings (
  school_id uuid primary key references public.schools(id) on delete cascade,
  school_year int not null default extract(year from now()),
  current_term smallint not null default 1 check (current_term between 1 and 4),
  passing_grade numeric(4,2) not null default 6 check (passing_grade between 0 and 10),
  allow_student_to_student_messages boolean not null default false,
  show_class_collective_goal boolean not null default true,
  class_goal_points int not null default 3000 check (class_goal_points > 0),
  max_upload_mb int not null default 2 check (max_upload_mb between 1 and 10)
);

-- ---------- Usuários e perfis ----------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid not null references public.schools(id),
  role text not null check (role in ('aluno', 'professor', 'admin')),
  name text not null check (char_length(name) between 3 and 100),
  email text not null unique,
  matricula text not null unique,
  avatar_color text not null default '#1877D2',
  photo_url text,
  phone text,
  birth_date date,
  guardian_name text, -- responsável legal (LGPD art. 14)
  bio text check (char_length(bio) <= 280),
  pronoun text check (pronoun in ('ela', 'ele', 'neutro')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index on public.profiles (school_id, role);

-- ---------- Turmas, disciplinas, matrículas e vínculos ----------
create table public.classes (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id),
  name text not null,
  series text not null,
  shift text not null check (shift in ('Manhã', 'Tarde', 'Noite', 'Integral')),
  year int not null,
  room text
);

create table public.subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text not null,
  color text not null default '#1877D2',
  workload int not null default 80 check (workload > 0)
);

create table public.enrollments (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete restrict,
  status text not null default 'ativa' check (status in ('ativa', 'trancada', 'transferida')),
  created_at timestamptz not null default now()
);
-- Um aluno tem no máximo uma matrícula ativa.
create unique index enrollments_one_active on public.enrollments (student_id) where status = 'ativa';
create index on public.enrollments (class_id) where status = 'ativa';

create table public.teaching_assignments (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  class_id uuid not null references public.classes(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete restrict,
  unique (class_id, subject_id)
);
create index on public.teaching_assignments (teacher_id);

-- ---------- Atividades, entregas e notas ----------
create table public.activities (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 140),
  description text not null default '',
  type text not null check (type in ('tarefa', 'trabalho', 'prova', 'questionario')),
  subject_id uuid not null references public.subjects(id),
  class_id uuid not null references public.classes(id) on delete cascade,
  teacher_id uuid not null references public.profiles(id),
  due_at timestamptz not null,
  max_score numeric(5,2) not null check (max_score > 0 and max_score <= 100),
  status text not null default 'publicada' check (status in ('publicada', 'rascunho')),
  attachment jsonb,
  created_at timestamptz not null default now()
);
create index on public.activities (class_id, subject_id);

create table public.submissions (
  id uuid primary key default gen_random_uuid(),
  activity_id uuid not null references public.activities(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  text text not null default '' check (char_length(text) <= 5000),
  file jsonb,
  submitted_at timestamptz not null default now(),
  status text not null default 'entregue' check (status in ('entregue', 'corrigida')),
  score numeric(5,2),
  feedback text,
  graded_at timestamptz,
  unique (activity_id, student_id)
);

create table public.grades (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  class_id uuid not null references public.classes(id),
  teacher_id uuid not null references public.profiles(id),
  term smallint not null check (term between 1 and 4),
  label text not null check (char_length(label) between 1 and 30),
  score numeric(5,2) not null,
  max_score numeric(5,2) not null default 10,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (score >= 0 and score <= max_score),
  unique (student_id, subject_id, term, label)
);
create index on public.grades (class_id, subject_id, term);

-- ---------- Agenda e biblioteca ----------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  type text not null check (type in ('prova', 'trabalho', 'aula', 'evento', 'feriado')),
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  all_day boolean not null default false,
  subject_id uuid references public.subjects(id),
  class_id uuid references public.classes(id) on delete cascade, -- null = escola toda
  location text,
  description text,
  created_by uuid not null references public.profiles(id),
  check (ends_at >= starts_at)
);
create index on public.events (starts_at);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  description text not null default '',
  type text not null check (type in ('pdf', 'video', 'link', 'apresentacao', 'livro')),
  subject_id uuid not null references public.subjects(id),
  class_id uuid references public.classes(id) on delete cascade,
  file jsonb,
  url text check (url is null or url like 'https://%'),
  downloadable boolean not null default true,
  uploaded_by uuid not null references public.profiles(id),
  pages int,
  created_at timestamptz not null default now(),
  check (file is not null or url is not null)
);

-- ---------- Comunicação ----------
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  participant_a uuid not null references public.profiles(id) on delete cascade,
  participant_b uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id),
  updated_at timestamptz not null default now(),
  check (participant_a < participant_b),
  unique (participant_a, participant_b)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index on public.messages (conversation_id, created_at);

create table public.announcements (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 120),
  body text not null check (char_length(body) between 5 and 2000),
  author_id uuid not null references public.profiles(id),
  audience text not null check (audience in ('todos', 'alunos', 'professores')),
  class_id uuid references public.classes(id) on delete cascade,
  priority text not null default 'normal' check (priority in ('normal', 'importante')),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('tarefa', 'nota', 'mensagem', 'aviso', 'desafio', 'agenda')),
  title text not null,
  body text not null default '',
  href text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

-- ---------- Desafios e pontuação ----------
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 3 and 100),
  description text not null default '',
  category text not null check (category in ('leitura', 'quiz', 'sustentabilidade', 'ciencias', 'meta')),
  kind text not null check (kind in ('quiz', 'checklist')),
  points int not null check (points between 1 and 500),
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  class_id uuid references public.classes(id) on delete cascade,
  subject_id uuid references public.subjects(id),
  questions jsonb,           -- [{prompt, options[], explanation}] SEM o gabarito
  answer_key int[],          -- gabarito: invisível para o cliente (ver 0002_rls.sql)
  steps jsonb,
  featured boolean not null default false,
  created_by uuid not null references public.profiles(id)
);

create table public.challenge_participations (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.challenges(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'em_andamento' check (status in ('em_andamento', 'concluido')),
  completed_steps int[] not null default '{}',
  best_score numeric(4,3),
  attempts int not null default 0,
  points_awarded int not null default 0,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (challenge_id, student_id)
);

create table public.point_entries (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  points int not null,
  reason text not null,
  challenge_id uuid references public.challenges(id) on delete set null,
  created_at timestamptz not null default now()
);
create index on public.point_entries (student_id);
