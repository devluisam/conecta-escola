/**
 * Contrato único de acesso a dados. A interface não sabe se os dados vêm do
 * modo demonstração (navegador) ou do Supabase — as telas só conhecem isto.
 * Toda regra de permissão é aplicada na implementação (no Supabase, também via RLS).
 */
import type {
  Activity,
  ActivityType,
  Announcement,
  Audience,
  CalendarEvent,
  Challenge,
  ChallengeParticipation,
  Conversation,
  EventType,
  FileRef,
  Grade,
  Material,
  MaterialType,
  Message,
  Notification,
  PointEntry,
  Role,
  School,
  SchoolClass,
  SchoolSettings,
  StudentTaskStatus,
  Subject,
  Submission,
  TeachingAssignment,
  User,
} from "@/lib/types"

export type PublicUser = Pick<User, "id" | "name" | "role" | "avatarColor" | "photoDataUrl" | "matricula">

export interface ActivityView extends Activity {
  subject: Subject
  schoolClass: SchoolClass
  teacher: PublicUser
  mySubmission?: Submission | null
  studentStatus?: StudentTaskStatus
  stats?: { students: number; submitted: number; graded: number; toGrade: number }
}

export interface SubmissionView extends Submission {
  student: PublicUser
}

export interface SubjectView extends Subject {
  classId: string
  className: string
  teacher: PublicUser | null
  pendingTasks: number
  totalTasks: number
  materialsCount: number
  average: number | null
}

export interface GradeView extends Grade {
  subject: Subject
  student: PublicUser
}

export interface EventView extends CalendarEvent {
  subject?: Subject | null
  className?: string | null
  source: "evento" | "atividade"
  href?: string
  editable: boolean
}

export interface MaterialView extends Material {
  subject: Subject
  author: PublicUser
  className?: string | null
  canDelete: boolean
}

export interface ConversationView extends Conversation {
  other: PublicUser
  subtitle: string
  lastMessage: Message | null
  unread: number
}

export interface Contact extends PublicUser {
  subtitle: string
}

export interface AnnouncementView extends Announcement {
  author: PublicUser
  className?: string | null
  canDelete: boolean
}

export interface ChallengeView extends Challenge {
  participation: ChallengeParticipation | null
  participants: number
  completed: number
  subject?: Subject | null
  className?: string | null
  isOpen: boolean
}

export interface Badge {
  id: string
  name: string
  description: string
  earned: boolean
  icon: "sprout" | "book" | "brain" | "flask" | "flame" | "star"
}

export interface PointsSummary {
  total: number
  entries: PointEntry[]
  badges: Badge[]
  classGoal: { enabled: boolean; current: number; goal: number; className: string } | null
}

export interface ClassView extends SchoolClass {
  students: number
  teachers: { teacher: PublicUser; subject: Subject }[]
  /** Disciplinas que o professor logado leciona nesta turma. */
  mySubjects: Subject[]
}

export interface UserView extends User {
  classId?: string | null
  className?: string | null
  assignmentsCount: number
}

export interface TeachingContext {
  assignment: TeachingAssignment
  schoolClass: SchoolClass
  subject: Subject
}

export interface MyContext {
  school: School
  schoolClass: SchoolClass | null
  settings: SchoolSettings
}

export interface AdminStats {
  students: number
  teachers: number
  classes: number
  subjects: number
  activities: number
  submissionRate: number
  averageGrade: number
  activeChallenges: number
  messagesThisWeek: number
  byClass: { className: string; students: number; average: number; submissionRate: number }[]
  bySubject: { subject: string; color: string; average: number }[]
}

// ---------- Entradas ----------
export interface ActivityInput {
  id?: string
  title: string
  description: string
  type: ActivityType
  classId: string
  subjectId: string
  dueAt: string
  maxScore: number
  status: Activity["status"]
  attachment?: FileRef | null
}

export interface EventInput {
  id?: string
  title: string
  type: EventType
  startsAt: string
  endsAt: string
  classId?: string | null
  subjectId?: string | null
  location?: string | null
  description?: string | null
}

export interface MaterialInput {
  title: string
  description: string
  type: MaterialType
  subjectId: string
  classId?: string | null
  file?: FileRef | null
  url?: string | null
  downloadable: boolean
}

export interface GradeInput {
  id?: string
  studentId: string
  subjectId: string
  classId: string
  term: Grade["term"]
  label: string
  score: number
  maxScore: number
}

export interface AnnouncementInput {
  title: string
  body: string
  audience: Audience
  classId?: string | null
  priority: Announcement["priority"]
}

export interface ChallengeInput {
  title: string
  description: string
  category: Challenge["category"]
  kind: Challenge["kind"]
  points: number
  endsAt: string
  classId?: string | null
  subjectId?: string | null
  steps?: string[]
  questions?: Challenge["questions"]
}

export interface ProfilePatch {
  name?: string
  phone?: string | null
  bio?: string | null
  photoDataUrl?: string | null
  pronoun?: User["pronoun"]
}

export interface UserInput {
  role: Role
  name: string
  email: string
  matricula: string
  password: string
  classId?: string | null
  birthDate?: string | null
  guardianName?: string | null
}

export interface UserPatch {
  name?: string
  email?: string
  matricula?: string
  classId?: string | null
  birthDate?: string | null
  guardianName?: string | null
}

export interface Repository {
  readonly mode: "demo" | "supabase"

  // Autenticação e perfil
  signIn(identifier: string, password: string, remember: boolean): Promise<User>
  signInDemo(role: Role): Promise<User>
  signOut(): Promise<void>
  getCurrentUser(): Promise<User | null>
  requestPasswordReset(identifier: string): Promise<void>
  changePassword(current: string, next: string): Promise<void>
  updateMyProfile(patch: ProfilePatch): Promise<User>
  getMyContext(): Promise<MyContext>

  // Acadêmico
  listSubjects(): Promise<SubjectView[]>
  listActivities(filter?: { classId?: string; subjectId?: string }): Promise<ActivityView[]>
  getActivity(id: string): Promise<ActivityView>
  saveActivity(input: ActivityInput): Promise<Activity>
  deleteActivity(id: string): Promise<void>
  listSubmissions(activityId: string): Promise<SubmissionView[]>
  submitActivity(activityId: string, input: { text: string; file?: FileRef | null }): Promise<Submission>
  gradeSubmission(submissionId: string, input: { score: number; feedback: string }): Promise<Submission>
  listGrades(filter?: { classId?: string; subjectId?: string; term?: number }): Promise<GradeView[]>
  saveGrade(input: GradeInput): Promise<Grade>
  deleteGrade(id: string): Promise<void>
  listMyClasses(): Promise<ClassView[]>
  getClassRoster(classId: string): Promise<PublicUser[]>
  listTeachingContexts(): Promise<TeachingContext[]>

  // Agenda
  listEvents(range: { from: string; to: string }): Promise<EventView[]>
  saveEvent(input: EventInput): Promise<CalendarEvent>
  deleteEvent(id: string): Promise<void>

  // Biblioteca
  listMaterials(): Promise<MaterialView[]>
  saveMaterial(input: MaterialInput): Promise<Material>
  deleteMaterial(id: string): Promise<void>

  // Comunicação
  listConversations(): Promise<ConversationView[]>
  listMessages(conversationId: string): Promise<Message[]>
  sendMessage(conversationId: string, body: string): Promise<Message>
  startConversation(otherUserId: string): Promise<Conversation>
  markConversationRead(conversationId: string): Promise<void>
  listContacts(): Promise<Contact[]>
  listAnnouncements(): Promise<AnnouncementView[]>
  saveAnnouncement(input: AnnouncementInput): Promise<Announcement>
  deleteAnnouncement(id: string): Promise<void>
  listNotifications(): Promise<Notification[]>
  markNotificationRead(id: string): Promise<void>
  markAllNotificationsRead(): Promise<void>

  // Gamificação
  listChallenges(): Promise<ChallengeView[]>
  getChallenge(id: string): Promise<ChallengeView>
  joinChallenge(id: string): Promise<ChallengeParticipation>
  toggleChallengeStep(id: string, step: number): Promise<ChallengeParticipation>
  /** answerKey: gabarito devolvido só depois do envio (no Supabase ele não fica visível antes). */
  submitQuiz(id: string, answers: number[]): Promise<{ correct: number; total: number; pointsAwarded: number; answerKey?: number[] }>
  saveChallenge(input: ChallengeInput): Promise<Challenge>
  getPointsSummary(): Promise<PointsSummary>

  // Administração
  listUsers(filter?: { role?: Role }): Promise<UserView[]>
  createUser(input: UserInput): Promise<User>
  updateUser(id: string, patch: UserPatch): Promise<User>
  setUserActive(id: string, active: boolean): Promise<void>
  listClasses(): Promise<ClassView[]>
  saveClass(input: Omit<SchoolClass, "id" | "schoolId"> & { id?: string }): Promise<SchoolClass>
  deleteClass(id: string): Promise<void>
  listAllSubjects(): Promise<Subject[]>
  saveSubject(input: Omit<Subject, "id"> & { id?: string }): Promise<Subject>
  deleteSubject(id: string): Promise<void>
  listAssignments(): Promise<TeachingContext[]>
  saveAssignment(input: { teacherId: string; classId: string; subjectId: string }): Promise<TeachingAssignment>
  deleteAssignment(id: string): Promise<void>
  getSettings(): Promise<SchoolSettings>
  updateSettings(patch: Partial<SchoolSettings>): Promise<SchoolSettings>
  getAdminStats(): Promise<AdminStats>

  /** Restaura os dados fictícios (somente modo demo). */
  resetDemo?(): Promise<void>
}

export class AppError extends Error {
  constructor(
    message: string,
    public code: "forbidden" | "not_found" | "invalid" | "auth" | "not_configured" = "invalid",
  ) {
    super(message)
    this.name = "AppError"
  }
}

export const forbidden = (msg = "Você não tem permissão para esta ação.") => new AppError(msg, "forbidden")
export const notFound = (msg = "Registro não encontrado.") => new AppError(msg, "not_found")
export const invalid = (msg: string) => new AppError(msg, "invalid")

export type { Conversation, Message, Notification, PointEntry }
