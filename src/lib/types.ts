/**
 * Modelo de domínio do Conecta Escola.
 * Os nomes espelham as tabelas em supabase/migrations (snake_case lá, camelCase aqui).
 */

export type Role = "aluno" | "professor" | "admin"

export type ID = string

export interface School {
  id: ID
  name: string
  city: string
  inep: string
}

export interface User {
  id: ID
  role: Role
  name: string
  email: string
  /** Matrícula escolar (alunos) ou registro funcional (professores/admin). */
  matricula: string
  schoolId: ID
  avatarColor: string
  photoDataUrl?: string | null
  phone?: string | null
  birthDate?: string | null
  /** Responsável legal — obrigatório para alunos menores de idade (LGPD art. 14). */
  guardianName?: string | null
  bio?: string | null
  /** Forma de tratamento escolhida pela pessoa (usada nas saudações). */
  pronoun?: "ela" | "ele" | "neutro" | null
  active: boolean
  createdAt: string
}

/** Credencial armazenada apenas como hash PBKDF2 + salt (nunca texto simples). */
export interface Credential {
  userId: ID
  salt: string
  hash: string
  updatedAt: string
}

export interface SchoolClass {
  id: ID
  schoolId: ID
  name: string
  series: string
  shift: "Manhã" | "Tarde" | "Noite" | "Integral"
  year: number
  room?: string | null
}

export interface Enrollment {
  id: ID
  studentId: ID
  classId: ID
  status: "ativa" | "trancada" | "transferida"
  createdAt: string
}

export interface Subject {
  id: ID
  name: string
  code: string
  color: string
  workload: number
}

export interface TeachingAssignment {
  id: ID
  teacherId: ID
  classId: ID
  subjectId: ID
}

export type ActivityType = "tarefa" | "trabalho" | "prova" | "questionario"

export interface FileRef {
  name: string
  size: number
  mime: string
  /** No modo demo o arquivo fica embutido; no Supabase vira caminho do Storage. */
  url: string
}

export interface Activity {
  id: ID
  title: string
  description: string
  type: ActivityType
  subjectId: ID
  classId: ID
  teacherId: ID
  dueAt: string
  maxScore: number
  status: "publicada" | "rascunho"
  attachment?: FileRef | null
  createdAt: string
}

export type SubmissionStatus = "entregue" | "corrigida"

export interface Submission {
  id: ID
  activityId: ID
  studentId: ID
  text: string
  file?: FileRef | null
  submittedAt: string
  status: SubmissionStatus
  score?: number | null
  feedback?: string | null
  gradedAt?: string | null
}

/** Status do ponto de vista do aluno, derivado de atividade + entrega. */
export type StudentTaskStatus = "pendente" | "atrasada" | "entregue" | "corrigida"

export interface Grade {
  id: ID
  studentId: ID
  subjectId: ID
  classId: ID
  teacherId: ID
  term: 1 | 2 | 3 | 4
  label: string
  score: number
  maxScore: number
  createdAt: string
  updatedAt: string
}

export type EventType = "prova" | "trabalho" | "aula" | "evento" | "feriado"

export interface CalendarEvent {
  id: ID
  title: string
  type: EventType
  startsAt: string
  endsAt: string
  allDay?: boolean
  subjectId?: ID | null
  /** null = evento de toda a escola (calendário institucional). */
  classId?: ID | null
  location?: string | null
  description?: string | null
  createdBy: ID
}

export type MaterialType = "pdf" | "video" | "link" | "apresentacao" | "livro"

export interface Material {
  id: ID
  title: string
  description: string
  type: MaterialType
  subjectId: ID
  classId?: ID | null
  file?: FileRef | null
  url?: string | null
  downloadable: boolean
  uploadedBy: ID
  createdAt: string
  pages?: number | null
}

export interface Conversation {
  id: ID
  participantIds: [ID, ID]
  subjectId?: ID | null
  updatedAt: string
}

export interface Message {
  id: ID
  conversationId: ID
  senderId: ID
  body: string
  createdAt: string
  readAt?: string | null
}

export type Audience = "todos" | "alunos" | "professores"

export interface Announcement {
  id: ID
  title: string
  body: string
  authorId: ID
  audience: Audience
  /** Quando preenchido, o aviso é só para a turma. */
  classId?: ID | null
  priority: "normal" | "importante"
  createdAt: string
}

export interface Notification {
  id: ID
  userId: ID
  kind: "tarefa" | "nota" | "mensagem" | "aviso" | "desafio" | "agenda"
  title: string
  body: string
  href?: string | null
  read: boolean
  createdAt: string
}

export type ChallengeCategory = "leitura" | "quiz" | "sustentabilidade" | "ciencias" | "meta"

export interface QuizQuestion {
  prompt: string
  options: string[]
  answer: number
  explanation?: string
}

export interface Challenge {
  id: ID
  title: string
  description: string
  category: ChallengeCategory
  /** quiz = perguntas; checklist = etapas marcáveis. */
  kind: "quiz" | "checklist"
  points: number
  startsAt: string
  endsAt: string
  classId?: ID | null
  subjectId?: ID | null
  questions?: QuizQuestion[]
  steps?: string[]
  featured?: boolean
  createdBy: ID
}

export interface ChallengeParticipation {
  id: ID
  challengeId: ID
  studentId: ID
  status: "em_andamento" | "concluido"
  completedSteps: number[]
  /** Melhor acerto (0..1) em quizzes — fica privado ao aluno e ao professor. */
  bestScore?: number | null
  attempts: number
  pointsAwarded: number
  startedAt: string
  completedAt?: string | null
}

export interface PointEntry {
  id: ID
  studentId: ID
  points: number
  reason: string
  challengeId?: ID | null
  createdAt: string
}

export interface SchoolSettings {
  schoolYear: number
  currentTerm: 1 | 2 | 3 | 4
  passingGrade: number
  allowStudentToStudentMessages: boolean
  showClassCollectiveGoal: boolean
  classGoalPoints: number
  maxUploadMb: number
}

export interface Session {
  user: User
  mode: "demo" | "supabase"
}
