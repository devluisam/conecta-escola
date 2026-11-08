"use client"

import type { PostgrestError } from "@supabase/supabase-js"
import { createDemoRepository } from "@/lib/demo/demo-repository"
import type { DemoDB } from "@/lib/demo/seed"
import { memorySession, memoryStorage } from "@/lib/demo/storage"
import { getSupabase } from "@/lib/supabase/client"
import type { FileRef, User } from "@/lib/types"
import { AppError, forbidden, invalid, type Repository } from "./repository"

/**
 * Implementação real (Supabase/PostgreSQL).
 *
 * Leituras: carrega um retrato das tabelas JÁ FILTRADO PELO RLS (cada perfil só
 * recebe o que pode ver) e reutiliza a montagem das telas do modo demo.
 * Escritas: vão direto às tabelas/RPCs; o banco valida permissões (0002_rls.sql)
 * e calcula pontuação e notificações (0003_functions.sql).
 */

const camel = (k: string) => k.replace(/_([a-z])/g, (_, c: string) => c.toUpperCase())
const snake = (k: string) => k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
type Row = Record<string, unknown>
const toCamel = <T,>(row: unknown): T => Object.fromEntries(Object.entries(row as Row).map(([k, v]) => [camel(k), v])) as T
const toSnake = (obj: object): Row =>
  Object.fromEntries(
    Object.entries(obj)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => [snake(k), v]),
  )

function fail(error: { message: string; code?: string } | null): never {
  if (error?.code === "42501") throw forbidden()
  if (error?.code === "23505") throw invalid("Já existe um registro com esses dados.")
  throw new AppError(error?.message || "Erro ao comunicar com o servidor.")
}
type Result<T> = PromiseLike<{ data: T; error: PostgrestError | null }>
async function run<T>(p: Result<T>): Promise<T> {
  const { data, error } = await p
  if (error) fail(error)
  return data
}

const CHALLENGE_COLUMNS = "id,title,description,category,kind,points,starts_at,ends_at,class_id,subject_id,questions,steps,featured,created_by"
const TABLES = [
  "schools",
  "profiles",
  "classes",
  "enrollments",
  "subjects",
  "teaching_assignments",
  "activities",
  "submissions",
  "grades",
  "events",
  "materials",
  "conversations",
  "messages",
  "announcements",
  "notifications",
  "challenge_participations",
  "point_entries",
] as const
type Table = (typeof TABLES)[number]

export function createSupabaseRepository(): Repository {
  const sb = getSupabase()
  let cache: { at: number; userId: string; reader: Repository; db: DemoDB } | null = null

  async function currentProfile(): Promise<User | null> {
    const { data } = await sb.auth.getUser()
    if (!data.user) return null
    const { data: row } = await sb.from("profiles").select("*").eq("id", data.user.id).maybeSingle()
    if (!row) return null
    const u = toCamel<User & { photoUrl?: string | null }>(row)
    return { ...u, photoDataUrl: u.photoUrl ?? null }
  }

  async function me(): Promise<User> {
    const u = await currentProfile()
    if (!u || !u.active) throw new AppError("Sua sessão expirou. Entre novamente.", "auth")
    return u
  }

  /** Retrato RLS-filtrado, reaproveitado por ~3s entre as consultas de uma mesma tela. */
  async function reader(): Promise<{ repo: Repository; db: DemoDB }> {
    const user = await me()
    if (cache && cache.userId === user.id && Date.now() - cache.at < 3000) return { repo: cache.reader, db: cache.db }
    const [tables, challenges, settings] = await Promise.all([
      Promise.all(TABLES.map((t) => run(sb.from(t).select("*").limit(5000)))),
      run(sb.from("challenges").select(CHALLENGE_COLUMNS).limit(1000)),
      run(sb.from("school_settings").select("*").eq("school_id", user.schoolId).maybeSingle()),
    ])
    const at = (name: Table) => ((tables[TABLES.indexOf(name)] as unknown[]) ?? []).map((r) => toCamel<Row>(r))
    const db = {
      version: 0,
      seededAt: new Date().toISOString(),
      schools: at("schools"),
      users: at("profiles").map((u) => ({ ...u, photoDataUrl: u.photoUrl ?? null })),
      credentials: [],
      classes: at("classes"),
      enrollments: at("enrollments"),
      subjects: at("subjects"),
      assignments: at("teaching_assignments"),
      activities: at("activities"),
      submissions: at("submissions"),
      grades: at("grades"),
      events: at("events"),
      materials: at("materials"),
      conversations: at("conversations").map((c) => ({ ...c, participantIds: [c.participantA, c.participantB] })),
      messages: at("messages"),
      announcements: at("announcements"),
      notifications: at("notifications"),
      participations: at("challenge_participations"),
      points: at("point_entries"),
      challenges: ((challenges as unknown[]) ?? []).map((r) => toCamel<Row>(r)),
      settings: settings ? toCamel<Row>(settings) : {},
    } as unknown as DemoDB
    const session = memorySession()
    session.set(user.id, user.role, false)
    const repo = createDemoRepository({ storage: memoryStorage(db), session })
    cache = { at: Date.now(), userId: user.id, reader: repo, db }
    return { repo, db }
  }
  const read = async <T,>(fn: (r: Repository) => Promise<T>) => fn((await reader()).repo)
  const changed = () => {
    cache = null
  }
  async function write<T>(p: Result<T>) {
    const data = await run(p)
    changed()
    return data
  }
  const rpc = <T,>(fn: string, args?: Row) => write(sb.rpc(fn, args) as unknown as Result<T>)

  /** Anexos em data URL vão para o bucket privado "arquivos", na pasta do próprio usuário. */
  async function upload(file: FileRef | null | undefined): Promise<FileRef | null> {
    if (!file) return null
    if (!file.url.startsWith("data:")) return file
    const user = await me()
    const blob = await (await fetch(file.url)).blob()
    const path = `${user.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`
    const { error } = await sb.storage.from("arquivos").upload(path, blob, { contentType: file.mime })
    if (error) fail(error)
    return { ...file, url: `storage:arquivos/${path}` }
  }

  async function emailFor(identifier: string) {
    const id = identifier.trim()
    if (id.includes("@")) return id.toLowerCase()
    return run(sb.rpc("login_email", { p_identifier: id }) as unknown as Result<string | null>)
  }

  return {
    mode: "supabase",

    // ---------- Autenticação ----------
    async signIn(identifier, password) {
      const email = await emailFor(identifier)
      if (!email) throw new AppError("E-mail/matrícula ou senha incorretos.", "auth")
      const { error } = await sb.auth.signInWithPassword({ email, password })
      if (error)
        throw new AppError(error.status === 429 ? "Muitas tentativas. Aguarde e tente novamente." : "E-mail/matrícula ou senha incorretos.", "auth")
      const user = await currentProfile()
      if (!user || !user.active) {
        await sb.auth.signOut()
        throw new AppError("Este acesso está desativado. Procure a secretaria da escola.", "auth")
      }
      changed()
      return user
    },
    async signInDemo() {
      // Em produção não existe atalho de acesso: só login real.
      throw new AppError("O acesso de demonstração não está disponível em produção.", "not_configured")
    },
    async signOut() {
      changed()
      await sb.auth.signOut()
    },
    async getCurrentUser() {
      const u = await currentProfile()
      return u && u.active ? u : null
    },
    async requestPasswordReset(identifier) {
      const email = await emailFor(identifier).catch(() => null)
      // Resposta sempre igual, exista ou não o cadastro.
      if (email) await sb.auth.resetPasswordForEmail(email, { redirectTo: `${location.origin}/redefinir-senha` })
    },
    async changePassword(current, next) {
      const user = await me()
      const check = await sb.auth.signInWithPassword({ email: user.email, password: current })
      if (check.error) throw invalid("A senha atual está incorreta.")
      const { error } = await sb.auth.updateUser({ password: next })
      if (error) fail(error)
    },
    async updateMyProfile(patch) {
      const user = await me()
      const row = toSnake({
        name: user.role === "aluno" ? undefined : patch.name,
        phone: patch.phone,
        bio: patch.bio,
        pronoun: patch.pronoun,
        photoUrl: patch.photoDataUrl,
      })
      await write(sb.from("profiles").update(row).eq("id", user.id))
      return (await currentProfile())!
    },
    getMyContext: () => read((r) => r.getMyContext()),

    // ---------- Acadêmico ----------
    listSubjects: () => read((r) => r.listSubjects()),
    listActivities: (f) => read((r) => r.listActivities(f)),
    getActivity: (id) => read((r) => r.getActivity(id)),
    async saveActivity(input) {
      const user = await me()
      const attachment = await upload(input.attachment)
      const row = toSnake({ ...input, id: undefined, attachment, title: input.title.trim() })
      if (input.id) return toCamel(await write(sb.from("activities").update(row).eq("id", input.id).select().single()))
      return toCamel(await write(sb.from("activities").insert({ ...row, teacher_id: user.id }).select().single()))
    },
    async deleteActivity(id) {
      await write(sb.from("activities").delete().eq("id", id))
    },
    listSubmissions: (id) => read((r) => r.listSubmissions(id)),
    async submitActivity(activityId, input) {
      const user = await me()
      if (!input.text.trim() && !input.file) throw invalid("Escreva uma resposta ou anexe um arquivo.")
      const file = await upload(input.file)
      const row = { activity_id: activityId, student_id: user.id, text: input.text.trim(), file, submitted_at: new Date().toISOString(), status: "entregue" }
      return toCamel(await write(sb.from("submissions").upsert(row, { onConflict: "activity_id,student_id" }).select().single()))
    },
    async gradeSubmission(id, { score, feedback }) {
      const row = { score: Math.round(score * 10) / 10, feedback: feedback.trim(), status: "corrigida", graded_at: new Date().toISOString() }
      return toCamel(await write(sb.from("submissions").update(row).eq("id", id).select().single()))
    },
    listGrades: (f) => read((r) => r.listGrades(f)),
    async saveGrade(input) {
      const user = await me()
      const row = toSnake({ ...input, id: undefined, label: input.label.trim(), teacherId: user.id, updatedAt: new Date().toISOString() })
      if (input.id) return toCamel(await write(sb.from("grades").update(row).eq("id", input.id).select().single()))
      return toCamel(await write(sb.from("grades").insert(row).select().single()))
    },
    async deleteGrade(id) {
      await write(sb.from("grades").delete().eq("id", id))
    },
    listMyClasses: () => read((r) => r.listMyClasses()),
    getClassRoster: (id) => read((r) => r.getClassRoster(id)),
    listTeachingContexts: () => read((r) => r.listTeachingContexts()),

    // ---------- Agenda ----------
    listEvents: (range) => read((r) => r.listEvents(range)),
    async saveEvent(input) {
      const user = await me()
      const row = toSnake({ ...input, id: undefined })
      if (input.id) return toCamel(await write(sb.from("events").update(row).eq("id", input.id).select().single()))
      return toCamel(await write(sb.from("events").insert({ ...row, created_by: user.id }).select().single()))
    },
    async deleteEvent(id) {
      await write(sb.from("events").delete().eq("id", id))
    },

    // ---------- Biblioteca ----------
    listMaterials: () => read((r) => r.listMaterials()),
    async saveMaterial(input) {
      const user = await me()
      const file = await upload(input.file)
      return toCamel(await write(sb.from("materials").insert({ ...toSnake({ ...input, file }), uploaded_by: user.id }).select().single()))
    },
    async deleteMaterial(id) {
      await write(sb.from("materials").delete().eq("id", id))
    },

    // ---------- Comunicação ----------
    listConversations: () => read((r) => r.listConversations()),
    listMessages: (id) => read((r) => r.listMessages(id)),
    async sendMessage(conversationId, body) {
      const user = await me()
      const text = body.trim()
      if (!text) throw invalid("Escreva uma mensagem.")
      return toCamel(await write(sb.from("messages").insert({ conversation_id: conversationId, sender_id: user.id, body: text }).select().single()))
    },
    async startConversation(otherUserId) {
      const user = await me()
      const id = await rpc<string>("start_conversation", { p_other: otherUserId })
      return { id, participantIds: [user.id, otherUserId], subjectId: null, updatedAt: new Date().toISOString() }
    },
    async markConversationRead(conversationId) {
      const user = await me()
      await write(
        sb.from("messages").update({ read_at: new Date().toISOString() }).eq("conversation_id", conversationId).neq("sender_id", user.id).is("read_at", null),
      )
    },
    listContacts: () => read((r) => r.listContacts()),
    listAnnouncements: () => read((r) => r.listAnnouncements()),
    async saveAnnouncement(input) {
      const user = await me()
      const row = toSnake({ ...input, audience: user.role === "professor" ? "alunos" : input.audience, authorId: user.id })
      return toCamel(await write(sb.from("announcements").insert(row).select().single()))
    },
    async deleteAnnouncement(id) {
      await write(sb.from("announcements").delete().eq("id", id))
    },
    async listNotifications() {
      const rows = await run(sb.from("notifications").select("*").order("created_at", { ascending: false }).limit(30))
      return ((rows as unknown[]) ?? []).map((r) => toCamel(r))
    },
    async markNotificationRead(id) {
      await write(sb.from("notifications").update({ read: true }).eq("id", id))
    },
    async markAllNotificationsRead() {
      const user = await me()
      await write(sb.from("notifications").update({ read: true }).eq("user_id", user.id).eq("read", false))
    },

    // ---------- Gamificação (pontos calculados no banco) ----------
    listChallenges: () => read((r) => r.listChallenges()),
    getChallenge: (id) => read((r) => r.getChallenge(id)),
    async joinChallenge(id) {
      return toCamel(await rpc<Row>("join_challenge", { p_challenge: id }))
    },
    async toggleChallengeStep(id, step) {
      return toCamel(await rpc<Row>("toggle_challenge_step", { p_challenge: id, p_step: step }))
    },
    submitQuiz: (id, answers) =>
      rpc<{ correct: number; total: number; pointsAwarded: number; answerKey: number[] }>("submit_quiz", { p_challenge: id, p_answers: answers }),
    async saveChallenge(input) {
      const user = await me()
      const row = toSnake({
        ...input,
        questions: input.questions?.map((q) => ({ prompt: q.prompt, options: q.options, explanation: q.explanation ?? null })),
        answerKey: input.questions?.map((q) => q.answer),
        steps: input.steps?.map((s) => s.trim()).filter(Boolean),
        createdBy: user.id,
      })
      return toCamel(await write(sb.from("challenges").insert(row).select(CHALLENGE_COLUMNS).single()))
    },
    async getPointsSummary() {
      const summary = await read((r) => r.getPointsSummary())
      if (summary.classGoal) summary.classGoal.current = (await run(sb.rpc("class_points_total") as unknown as Result<number>)) ?? summary.classGoal.current
      return summary
    },

    // ---------- Administração ----------
    listUsers: (f) => read((r) => r.listUsers(f)),
    async createUser(input) {
      // Criar login exige a service role, que nunca vai ao navegador: rota no servidor.
      const res = await fetch("/api/admin/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new AppError(body.error ?? "Não foi possível cadastrar o usuário.", res.status === 403 ? "forbidden" : "invalid")
      changed()
      return body.user as User
    },
    async updateUser(id, patch) {
      const { classId, ...rest } = patch
      await write(sb.from("profiles").update(toSnake(rest)).eq("id", id))
      if (classId !== undefined) {
        await write(sb.from("enrollments").update({ status: "transferida" }).eq("student_id", id).eq("status", "ativa"))
        if (classId) await write(sb.from("enrollments").insert({ student_id: id, class_id: classId }))
      }
      const { db } = await reader()
      return db.users.find((u) => u.id === id)!
    },
    async setUserActive(id, active) {
      const user = await me()
      if (id === user.id) throw invalid("Você não pode desativar o próprio acesso.")
      await write(sb.from("profiles").update({ active }).eq("id", id))
    },
    listClasses: () => read((r) => r.listClasses()),
    async saveClass(input) {
      const user = await me()
      const row = toSnake({ ...input, id: undefined })
      if (input.id) return toCamel(await write(sb.from("classes").update(row).eq("id", input.id).select().single()))
      return toCamel(await write(sb.from("classes").insert({ ...row, school_id: user.schoolId }).select().single()))
    },
    async deleteClass(id) {
      await write(sb.from("classes").delete().eq("id", id))
    },
    listAllSubjects: () => read((r) => r.listAllSubjects()),
    async saveSubject(input) {
      const row = toSnake({ ...input, id: undefined })
      if (input.id) return toCamel(await write(sb.from("subjects").update(row).eq("id", input.id).select().single()))
      return toCamel(await write(sb.from("subjects").insert(row).select().single()))
    },
    async deleteSubject(id) {
      await write(sb.from("subjects").delete().eq("id", id))
    },
    listAssignments: () => read((r) => r.listAssignments()),
    async saveAssignment(input) {
      const row = { teacher_id: input.teacherId, class_id: input.classId, subject_id: input.subjectId }
      return toCamel(await write(sb.from("teaching_assignments").upsert(row, { onConflict: "class_id,subject_id" }).select().single()))
    },
    async deleteAssignment(id) {
      await write(sb.from("teaching_assignments").delete().eq("id", id))
    },
    getSettings: () => read((r) => r.getSettings()),
    async updateSettings(patch) {
      const user = await me()
      const rest = Object.fromEntries(Object.entries(patch).filter(([k]) => k !== "schoolId"))
      return toCamel(await write(sb.from("school_settings").update(toSnake(rest)).eq("school_id", user.schoolId).select().single()))
    },
    getAdminStats: () => read((r) => r.getAdminStats()),
  }
}
