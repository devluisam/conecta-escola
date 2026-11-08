import { hashPassword, randomSalt, uid, verifyPassword } from "@/lib/crypto"
import {
  AppError,
  forbidden,
  invalid,
  notFound,
  type ActivityView,
  type AdminStats,
  type AnnouncementView,
  type Badge,
  type ChallengeView,
  type ClassView,
  type Contact,
  type ConversationView,
  type EventView,
  type GradeView,
  type MaterialView,
  type PublicUser,
  type Repository,
  type SubjectView,
  type SubmissionView,
  type TeachingContext,
  type UserView,
} from "@/lib/data/repository"
import type {
  Activity,
  Challenge,
  ChallengeParticipation,
  Notification,
  Role,
  StudentTaskStatus,
  Submission,
  User,
} from "@/lib/types"
import { DEMO_ACCOUNTS, type DemoDB } from "./seed"
import type { DemoSessionStore, DemoStorage } from "./storage"

interface Options {
  storage: DemoStorage
  session: DemoSessionStore
  /** Latência simulada (ms) para exibir estados de carregamento de forma realista. */
  latency?: number
}

const MAX_ATTEMPTS = 5
const LOCK_MS = 30_000

export function createDemoRepository({ storage, session, latency = 0 }: Options): Repository {
  const failed = { count: 0, until: 0 }

  const wait = () => (latency ? new Promise((r) => setTimeout(r, latency * (0.6 + Math.random() * 0.8))) : Promise.resolve())
  const now = () => new Date().toISOString()
  const db = () => storage.load()
  /** Executa uma mutação sobre uma cópia e persiste somente se tudo der certo. */
  const mutate = <T,>(fn: (d: DemoDB) => T): T => {
    const draft = structuredClone(storage.load())
    const result = fn(draft)
    storage.save(draft)
    return result
  }

  // ---------- Identidade e vínculos ----------
  function me(d = db()): User {
    const s = session.get()
    const user = s && d.users.find((u) => u.id === s.userId)
    if (!user || !user.active) throw new AppError("Sua sessão expirou. Entre novamente.", "auth")
    return user
  }
  const requireRole = (user: User, ...roles: Role[]) => {
    if (!roles.includes(user.role)) throw forbidden()
  }
  const pub = (u: User | undefined): PublicUser =>
    u
      ? { id: u.id, name: u.name, role: u.role, avatarColor: u.avatarColor, photoDataUrl: u.photoDataUrl ?? null, matricula: u.matricula }
      : { id: "?", name: "Usuário removido", role: "aluno", avatarColor: "#94A3B8", photoDataUrl: null, matricula: "" }
  const userById = (d: DemoDB, id: string) => d.users.find((u) => u.id === id)
  const classOfStudent = (d: DemoDB, studentId: string) =>
    d.enrollments.find((e) => e.studentId === studentId && e.status === "ativa")?.classId ?? null
  const studentsOfClass = (d: DemoDB, classId: string) =>
    d.enrollments
      .filter((e) => e.classId === classId && e.status === "ativa")
      .map((e) => userById(d, e.studentId))
      .filter((u): u is User => Boolean(u && u.active))
  const assignmentsOf = (d: DemoDB, teacherId: string) => d.assignments.filter((a) => a.teacherId === teacherId)
  const teaches = (d: DemoDB, teacherId: string, classId: string, subjectId?: string | null) =>
    d.assignments.some((a) => a.teacherId === teacherId && a.classId === classId && (!subjectId || a.subjectId === subjectId))
  const teacherClassIds = (d: DemoDB, teacherId: string) => [...new Set(assignmentsOf(d, teacherId).map((a) => a.classId))]
  const subjectById = (d: DemoDB, id: string) => {
    const s = d.subjects.find((x) => x.id === id)
    if (!s) throw notFound("Disciplina não encontrada.")
    return s
  }
  const classById = (d: DemoDB, id: string) => {
    const c = d.classes.find((x) => x.id === id)
    if (!c) throw notFound("Turma não encontrada.")
    return c
  }
  const notify = (d: DemoDB, userIds: string[], n: Omit<Notification, "id" | "userId" | "read" | "createdAt">) => {
    for (const userId of new Set(userIds)) d.notifications.push({ ...n, id: uid("ntf-"), userId, read: false, createdAt: now() })
  }

  // ---------- Atividades ----------
  function canSeeActivity(d: DemoDB, user: User, a: Activity) {
    if (user.role === "admin") return true
    if (user.role === "professor") return a.teacherId === user.id || teaches(d, user.id, a.classId, a.subjectId)
    return a.status === "publicada" && classOfStudent(d, user.id) === a.classId
  }
  function studentStatus(a: Activity, s: Submission | null | undefined): StudentTaskStatus {
    if (s) return s.status === "corrigida" ? "corrigida" : "entregue"
    return new Date(a.dueAt).getTime() < Date.now() ? "atrasada" : "pendente"
  }
  function activityView(d: DemoDB, user: User, a: Activity): ActivityView {
    const view: ActivityView = {
      ...a,
      subject: subjectById(d, a.subjectId),
      schoolClass: classById(d, a.classId),
      teacher: pub(userById(d, a.teacherId)),
    }
    if (user.role === "aluno") {
      const mine = d.submissions.find((s) => s.activityId === a.id && s.studentId === user.id) ?? null
      view.mySubmission = mine
      view.studentStatus = studentStatus(a, mine)
    } else {
      const subs = d.submissions.filter((s) => s.activityId === a.id)
      view.stats = {
        students: studentsOfClass(d, a.classId).length,
        submitted: subs.length,
        graded: subs.filter((s) => s.status === "corrigida").length,
        toGrade: subs.filter((s) => s.status === "entregue").length,
      }
    }
    return view
  }
  function requireActivity(d: DemoDB, user: User, id: string) {
    const a = d.activities.find((x) => x.id === id)
    if (!a || !canSeeActivity(d, user, a)) throw notFound("Atividade não encontrada.")
    return a
  }
  const canManageActivity = (d: DemoDB, user: User, classId: string, subjectId: string) =>
    user.role === "admin" || (user.role === "professor" && teaches(d, user.id, classId, subjectId))

  // ---------- Notas ----------
  function canSeeGrade(d: DemoDB, user: User, g: { studentId: string; classId: string; subjectId: string }) {
    if (user.role === "admin") return true
    if (user.role === "professor") return teaches(d, user.id, g.classId, g.subjectId)
    return g.studentId === user.id
  }

  // ---------- Contatos (vínculos escolares) ----------
  function contactsOf(d: DemoDB, user: User): Contact[] {
    const list = new Map<string, Contact>()
    const add = (u: User | undefined, subtitle: string) => {
      if (u && u.active && u.id !== user.id && !list.has(u.id)) list.set(u.id, { ...pub(u), subtitle })
    }
    if (user.role === "aluno") {
      const classId = classOfStudent(d, user.id)
      if (classId) {
        d.assignments
          .filter((a) => a.classId === classId)
          .forEach((a) => add(userById(d, a.teacherId), `Prof. de ${subjectById(d, a.subjectId).name}`))
        if (d.settings.allowStudentToStudentMessages) studentsOfClass(d, classId).forEach((s) => add(s, "Colega de turma"))
      }
      d.users.filter((u) => u.role === "admin").forEach((u) => add(u, "Coordenação"))
    } else if (user.role === "professor") {
      for (const classId of teacherClassIds(d, user.id)) {
        const cls = classById(d, classId)
        studentsOfClass(d, classId).forEach((s) => add(s, `Aluno(a) – ${cls.name}`))
      }
      d.users.filter((u) => u.role === "professor").forEach((u) => add(u, "Professor(a)"))
      d.users.filter((u) => u.role === "admin").forEach((u) => add(u, "Coordenação"))
    } else {
      d.users.forEach((u) => {
        if (u.role === "aluno") {
          const c = classOfStudent(d, u.id)
          add(u, c ? `Aluno(a) – ${classById(d, c).name}` : "Aluno(a)")
        } else add(u, u.role === "professor" ? "Professor(a)" : "Coordenação")
      })
    }
    return [...list.values()].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
  }

  // ---------- Desafios ----------
  function canSeeChallenge(d: DemoDB, user: User, c: Challenge) {
    if (!c.classId || user.role === "admin") return true
    if (user.role === "professor") return teacherClassIds(d, user.id).includes(c.classId) || c.createdBy === user.id
    return classOfStudent(d, user.id) === c.classId
  }
  function challengeView(d: DemoDB, user: User, c: Challenge): ChallengeView {
    const parts = d.participations.filter((p) => p.challengeId === c.id)
    const t = Date.now()
    return {
      ...c,
      participation: user.role === "aluno" ? (parts.find((p) => p.studentId === user.id) ?? null) : null,
      participants: parts.length,
      completed: parts.filter((p) => p.status === "concluido").length,
      subject: c.subjectId ? subjectById(d, c.subjectId) : null,
      className: c.classId ? classById(d, c.classId).name : null,
      isOpen: new Date(c.startsAt).getTime() <= t && new Date(c.endsAt).getTime() >= t,
    }
  }
  function award(d: DemoDB, p: ChallengeParticipation, c: Challenge) {
    if (p.pointsAwarded > 0) return 0
    p.pointsAwarded = c.points
    p.status = "concluido"
    p.completedAt = now()
    d.points.push({ id: uid("pts-"), studentId: p.studentId, points: c.points, reason: `Desafio concluído: ${c.title}`, challengeId: c.id, createdAt: now() })
    notify(d, [p.studentId], { kind: "desafio", title: "Desafio concluído!", body: `Você ganhou ${c.points} pontos em "${c.title}".`, href: "/aluno/desafios" })
    return c.points
  }
  function participationFor(d: DemoDB, user: User, challengeId: string) {
    requireRole(user, "aluno")
    const c = d.challenges.find((x) => x.id === challengeId)
    if (!c || !canSeeChallenge(d, user, c)) throw notFound("Desafio não encontrado.")
    const t = Date.now()
    if (new Date(c.endsAt).getTime() < t) throw invalid("Este desafio já foi encerrado.")
    if (new Date(c.startsAt).getTime() > t) throw invalid("Este desafio ainda não começou.")
    let p = d.participations.find((x) => x.challengeId === c.id && x.studentId === user.id)
    if (!p) {
      p = { id: uid("par-"), challengeId: c.id, studentId: user.id, status: "em_andamento", completedSteps: [], attempts: 0, pointsAwarded: 0, startedAt: now() }
      d.participations.push(p)
    }
    return { c, p }
  }

  const validDate = (v: string, label: string) => {
    if (Number.isNaN(new Date(v).getTime())) throw invalid(`${label} inválida.`)
  }
  const MAX_FILE_BYTES = () => db().settings.maxUploadMb * 1024 * 1024 * 1.37 // base64 ≈ +37%
  const checkFile = (file?: { url: string; size: number } | null) => {
    if (file && file.url.startsWith("data:") && file.url.length > MAX_FILE_BYTES())
      throw invalid(`Arquivo maior que ${db().settings.maxUploadMb} MB.`)
  }

  const repo: Repository = {
    mode: "demo",

    // ================= Autenticação =================
    async signIn(identifier, password, remember) {
      await wait()
      if (Date.now() < failed.until) {
        const s = Math.ceil((failed.until - Date.now()) / 1000)
        throw new AppError(`Muitas tentativas. Aguarde ${s}s e tente novamente.`, "auth")
      }
      const id = identifier.trim().toLowerCase()
      const d = db()
      const user = d.users.find((u) => u.email.toLowerCase() === id || u.matricula.toLowerCase() === id)
      const cred = user && d.credentials.find((c) => c.userId === user.id)
      const ok = cred ? await verifyPassword(password, cred.salt, cred.hash) : false
      if (!user || !ok) {
        failed.count++
        if (failed.count >= MAX_ATTEMPTS) {
          failed.until = Date.now() + LOCK_MS
          failed.count = 0
        }
        throw new AppError("E-mail/matrícula ou senha incorretos.", "auth")
      }
      if (!user.active) throw new AppError("Este acesso está desativado. Procure a secretaria da escola.", "auth")
      failed.count = 0
      session.set(user.id, user.role, remember)
      return user
    },
    async signInDemo(role) {
      await wait()
      const user = db().users.find((u) => u.id === DEMO_ACCOUNTS[role].id)
      if (!user) throw notFound("Perfil de demonstração não encontrado. Restaure os dados de demonstração.")
      session.set(user.id, user.role, false)
      return user
    },
    async signOut() {
      session.clear()
    },
    async getCurrentUser() {
      const s = session.get()
      if (!s) return null
      const user = db().users.find((u) => u.id === s.userId)
      if (!user || !user.active || user.role !== s.role) {
        session.clear()
        return null
      }
      return user
    },
    async requestPasswordReset(identifier) {
      await wait()
      if (!identifier.trim()) throw invalid("Informe seu e-mail ou matrícula.")
      // Resposta sempre igual para não revelar se o cadastro existe.
    },
    async changePassword(current, next) {
      await wait()
      const d = db()
      const user = me(d)
      const cred = d.credentials.find((c) => c.userId === user.id)
      if (!cred || !(await verifyPassword(current, cred.salt, cred.hash))) throw invalid("A senha atual está incorreta.")
      const salt = randomSalt()
      const hash = await hashPassword(next, salt)
      mutate((m) => {
        const c = m.credentials.find((x) => x.userId === user.id)!
        Object.assign(c, { salt, hash, updatedAt: now() })
      })
    },
    async updateMyProfile(patch) {
      await wait()
      checkFile(patch.photoDataUrl ? { url: patch.photoDataUrl, size: 0 } : null)
      return mutate((d) => {
        const user = me(d)
        // Alunos não alteram o próprio nome (dado cadastral da secretaria).
        if (patch.name !== undefined && user.role !== "aluno") user.name = patch.name.trim() || user.name
        if (patch.phone !== undefined) user.phone = patch.phone
        if (patch.bio !== undefined) user.bio = patch.bio
        if (patch.photoDataUrl !== undefined) user.photoDataUrl = patch.photoDataUrl
        if (patch.pronoun !== undefined) user.pronoun = patch.pronoun
        return user
      })
    },
    async getMyContext() {
      await wait()
      const d = db()
      const user = me(d)
      const classId = user.role === "aluno" ? classOfStudent(d, user.id) : null
      return {
        school: d.schools.find((s) => s.id === user.schoolId) ?? d.schools[0],
        schoolClass: classId ? classById(d, classId) : null,
        settings: d.settings,
      }
    },

    // ================= Acadêmico =================
    async listSubjects() {
      await wait()
      const d = db()
      const user = me(d)
      const asg =
        user.role === "aluno"
          ? d.assignments.filter((a) => a.classId === classOfStudent(d, user.id))
          : user.role === "professor"
            ? assignmentsOf(d, user.id)
            : d.assignments
      return asg.map<SubjectView>((a) => {
        const subject = subjectById(d, a.subjectId)
        const acts = d.activities.filter((x) => x.classId === a.classId && x.subjectId === a.subjectId && x.status === "publicada")
        const myGrades = d.grades.filter(
          (g) => g.classId === a.classId && g.subjectId === a.subjectId && (user.role !== "aluno" || g.studentId === user.id),
        )
        const pending =
          user.role === "aluno"
            ? acts.filter((x) => !d.submissions.some((s) => s.activityId === x.id && s.studentId === user.id)).length
            : d.submissions.filter((s) => s.status === "entregue" && acts.some((x) => x.id === s.activityId)).length
        return {
          ...subject,
          classId: a.classId,
          className: classById(d, a.classId).name,
          teacher: pub(userById(d, a.teacherId)),
          pendingTasks: pending,
          totalTasks: acts.length,
          materialsCount: d.materials.filter((m) => m.subjectId === a.subjectId && (!m.classId || m.classId === a.classId)).length,
          average: myGrades.length ? Math.round((myGrades.reduce((s, g) => s + (g.score / g.maxScore) * 10, 0) / myGrades.length) * 10) / 10 : null,
        }
      })
    },
    async listActivities(filter) {
      await wait()
      const d = db()
      const user = me(d)
      return d.activities
        .filter((a) => canSeeActivity(d, user, a))
        .filter((a) => (!filter?.classId || a.classId === filter.classId) && (!filter?.subjectId || a.subjectId === filter.subjectId))
        .map((a) => activityView(d, user, a))
        .sort((a, b) => a.dueAt.localeCompare(b.dueAt))
    },
    async getActivity(id) {
      await wait()
      const d = db()
      const user = me(d)
      return activityView(d, user, requireActivity(d, user, id))
    },
    async saveActivity(input) {
      await wait()
      if (input.title.trim().length < 3) throw invalid("O título precisa ter pelo menos 3 caracteres.")
      if (!(input.maxScore > 0 && input.maxScore <= 100)) throw invalid("A pontuação máxima deve estar entre 0 e 100.")
      validDate(input.dueAt, "Data de entrega")
      checkFile(input.attachment)
      return mutate((d) => {
        const user = me(d)
        if (!canManageActivity(d, user, input.classId, input.subjectId))
          throw forbidden("Você só pode cadastrar atividades nas turmas e disciplinas que leciona.")
        if (input.id) {
          const a = d.activities.find((x) => x.id === input.id)
          if (!a) throw notFound("Atividade não encontrada.")
          if (user.role !== "admin" && a.teacherId !== user.id && !teaches(d, user.id, a.classId, a.subjectId)) throw forbidden()
          Object.assign(a, { ...input, title: input.title.trim() })
          return a
        }
        const a: Activity = {
          ...input,
          title: input.title.trim(),
          id: uid("act-"),
          teacherId: user.role === "professor" ? user.id : (d.assignments.find((x) => x.classId === input.classId && x.subjectId === input.subjectId)?.teacherId ?? user.id),
          attachment: input.attachment ?? null,
          createdAt: now(),
        }
        d.activities.push(a)
        if (a.status === "publicada")
          notify(d, studentsOfClass(d, a.classId).map((s) => s.id), {
            kind: "tarefa",
            title: "Nova atividade",
            body: `${subjectById(d, a.subjectId).name}: "${a.title}"`,
            href: `/aluno/tarefas/${a.id}`,
          })
        return a
      })
    },
    async deleteActivity(id) {
      await wait()
      mutate((d) => {
        const user = me(d)
        const a = d.activities.find((x) => x.id === id)
        if (!a) throw notFound()
        if (!canManageActivity(d, user, a.classId, a.subjectId)) throw forbidden()
        d.activities = d.activities.filter((x) => x.id !== id)
        d.submissions = d.submissions.filter((s) => s.activityId !== id)
      })
    },
    async listSubmissions(activityId) {
      await wait()
      const d = db()
      const user = me(d)
      const a = requireActivity(d, user, activityId)
      const subs = d.submissions.filter((s) => s.activityId === a.id && (user.role !== "aluno" || s.studentId === user.id))
      return subs
        .map<SubmissionView>((s) => ({ ...s, student: pub(userById(d, s.studentId)) }))
        .sort((x, y) => x.student.name.localeCompare(y.student.name, "pt-BR"))
    },
    async submitActivity(activityId, input) {
      await wait()
      if (!input.text.trim() && !input.file) throw invalid("Escreva uma resposta ou anexe um arquivo.")
      checkFile(input.file)
      return mutate((d) => {
        const user = me(d)
        requireRole(user, "aluno")
        const a = requireActivity(d, user, activityId)
        const existing = d.submissions.find((s) => s.activityId === a.id && s.studentId === user.id)
        if (existing?.status === "corrigida") throw invalid("Esta atividade já foi corrigida e não aceita nova entrega.")
        const data = { text: input.text.trim(), file: input.file ?? null, submittedAt: now(), status: "entregue" as const }
        if (existing) {
          Object.assign(existing, data)
          return existing
        }
        const s: Submission = { id: uid("sbm-"), activityId: a.id, studentId: user.id, ...data, score: null, feedback: null, gradedAt: null }
        d.submissions.push(s)
        notify(d, [a.teacherId], { kind: "tarefa", title: "Nova entrega", body: `${user.name} entregou "${a.title}".`, href: `/professor/atividades/${a.id}` })
        return s
      })
    },
    async gradeSubmission(submissionId, input) {
      await wait()
      return mutate((d) => {
        const user = me(d)
        requireRole(user, "professor", "admin")
        const s = d.submissions.find((x) => x.id === submissionId)
        if (!s) throw notFound("Entrega não encontrada.")
        const a = d.activities.find((x) => x.id === s.activityId)!
        if (user.role !== "admin" && !teaches(d, user.id, a.classId, a.subjectId)) throw forbidden("Você só pode corrigir atividades das suas turmas.")
        if (!(input.score >= 0 && input.score <= a.maxScore)) throw invalid(`A nota deve estar entre 0 e ${a.maxScore}.`)
        Object.assign(s, { score: Math.round(input.score * 10) / 10, feedback: input.feedback.trim(), status: "corrigida", gradedAt: now() })
        notify(d, [s.studentId], { kind: "nota", title: "Atividade corrigida", body: `"${a.title}" foi corrigida. Confira sua nota.`, href: `/aluno/tarefas/${a.id}` })
        return s
      })
    },
    async listGrades(filter) {
      await wait()
      const d = db()
      const user = me(d)
      return d.grades
        .filter((g) => canSeeGrade(d, user, g))
        .filter(
          (g) =>
            (!filter?.classId || g.classId === filter.classId) &&
            (!filter?.subjectId || g.subjectId === filter.subjectId) &&
            (!filter?.term || g.term === filter.term),
        )
        .map<GradeView>((g) => ({ ...g, subject: subjectById(d, g.subjectId), student: pub(userById(d, g.studentId)) }))
    },
    async saveGrade(input) {
      await wait()
      if (!input.label.trim()) throw invalid("Informe a avaliação (ex.: Avaliação 1).")
      if (!(input.score >= 0 && input.score <= input.maxScore)) throw invalid(`A nota deve estar entre 0 e ${input.maxScore}.`)
      return mutate((d) => {
        const user = me(d)
        // Princípio do menor privilégio: só o professor da disciplina lança notas.
        if (user.role !== "professor" || !teaches(d, user.id, input.classId, input.subjectId))
          throw forbidden("Somente o professor responsável pela disciplina pode lançar ou alterar notas.")
        if (classOfStudent(d, input.studentId) !== input.classId) throw invalid("O aluno não está matriculado nesta turma.")
        const score = Math.round(input.score * 10) / 10
        if (input.id) {
          const g = d.grades.find((x) => x.id === input.id)
          if (!g || !canSeeGrade(d, user, g)) throw notFound("Nota não encontrada.")
          Object.assign(g, { label: input.label.trim(), score, maxScore: input.maxScore, term: input.term, updatedAt: now() })
          return g
        }
        const g = { ...input, id: uid("grd-"), label: input.label.trim(), score, teacherId: user.id, createdAt: now(), updatedAt: now() }
        d.grades.push(g)
        notify(d, [input.studentId], { kind: "nota", title: "Nova nota lançada", body: `${subjectById(d, input.subjectId).name}: ${g.label}`, href: "/aluno/notas" })
        return g
      })
    },
    async deleteGrade(id) {
      await wait()
      mutate((d) => {
        const user = me(d)
        const g = d.grades.find((x) => x.id === id)
        if (!g) throw notFound()
        if (user.role !== "professor" || !teaches(d, user.id, g.classId, g.subjectId)) throw forbidden()
        d.grades = d.grades.filter((x) => x.id !== id)
      })
    },
    async listMyClasses() {
      await wait()
      const d = db()
      const user = me(d)
      const ids =
        user.role === "admin"
          ? d.classes.map((c) => c.id)
          : user.role === "professor"
            ? teacherClassIds(d, user.id)
            : [classOfStudent(d, user.id)].filter((x): x is string => Boolean(x))
      return ids.map((id) => classView(d, user, id))
    },
    async getClassRoster(classId) {
      await wait()
      const d = db()
      const user = me(d)
      if (user.role === "aluno" || (user.role === "professor" && !teaches(d, user.id, classId))) throw forbidden()
      return studentsOfClass(d, classId)
        .map(pub)
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    },
    async listTeachingContexts() {
      await wait()
      const d = db()
      const user = me(d)
      requireRole(user, "professor", "admin")
      const list = user.role === "admin" ? d.assignments : assignmentsOf(d, user.id)
      return list.map((a) => ({ assignment: a, schoolClass: classById(d, a.classId), subject: subjectById(d, a.subjectId) }))
    },

    // ================= Agenda =================
    async listEvents({ from, to }) {
      await wait()
      const d = db()
      const user = me(d)
      const inRange = (s: string, e: string) => s <= to && e >= from
      const myClasses =
        user.role === "aluno" ? [classOfStudent(d, user.id)] : user.role === "professor" ? teacherClassIds(d, user.id) : null
      const events: EventView[] = d.events
        .filter((e) => inRange(e.startsAt, e.endsAt))
        .filter((e) => !e.classId || !myClasses || myClasses.includes(e.classId))
        .filter((e) => !(user.role === "aluno" && e.title === "Conselho de classe"))
        .map((e) => ({
          ...e,
          subject: e.subjectId ? subjectById(d, e.subjectId) : null,
          className: e.classId ? classById(d, e.classId).name : null,
          source: "evento",
          editable: user.role === "admin" || e.createdBy === user.id,
        }))
      const acts = d.activities
        .filter((a) => canSeeActivity(d, user, a) && a.status === "publicada" && inRange(a.dueAt, a.dueAt))
        .filter(() => user.role !== "admin")
        .map<EventView>((a) => ({
          id: `due-${a.id}`,
          title: `Entrega: ${a.title}`,
          type: "trabalho",
          startsAt: a.dueAt,
          endsAt: a.dueAt,
          subjectId: a.subjectId,
          classId: a.classId,
          createdBy: a.teacherId,
          subject: subjectById(d, a.subjectId),
          className: classById(d, a.classId).name,
          description: a.description,
          location: null,
          source: "atividade",
          href: user.role === "aluno" ? `/aluno/tarefas/${a.id}` : `/professor/atividades/${a.id}`,
          editable: false,
        }))
      return [...events, ...acts].sort((a, b) => a.startsAt.localeCompare(b.startsAt))
    },
    async saveEvent(input) {
      await wait()
      if (input.title.trim().length < 3) throw invalid("Informe um título com pelo menos 3 caracteres.")
      validDate(input.startsAt, "Data de início")
      validDate(input.endsAt, "Data de término")
      if (input.endsAt < input.startsAt) throw invalid("O término precisa ser depois do início.")
      return mutate((d) => {
        const user = me(d)
        requireRole(user, "professor", "admin")
        if (user.role === "professor" && (!input.classId || !teaches(d, user.id, input.classId)))
          throw forbidden("Professores só podem agendar compromissos para as próprias turmas.")
        if (input.id) {
          const e = d.events.find((x) => x.id === input.id)
          if (!e) throw notFound()
          if (user.role !== "admin" && e.createdBy !== user.id) throw forbidden()
          Object.assign(e, input)
          return e
        }
        const e = { ...input, id: uid("evt-"), createdBy: user.id }
        d.events.push(e)
        const targets = input.classId ? studentsOfClass(d, input.classId).map((s) => s.id) : []
        notify(d, targets, { kind: "agenda", title: "Novo compromisso na agenda", body: e.title, href: "/aluno/agenda" })
        return e
      })
    },
    async deleteEvent(id) {
      await wait()
      mutate((d) => {
        const user = me(d)
        const e = d.events.find((x) => x.id === id)
        if (!e) throw notFound()
        if (user.role !== "admin" && e.createdBy !== user.id) throw forbidden()
        d.events = d.events.filter((x) => x.id !== id)
      })
    },

    // ================= Biblioteca =================
    async listMaterials() {
      await wait()
      const d = db()
      const user = me(d)
      let visible = d.materials
      if (user.role === "aluno") {
        const classId = classOfStudent(d, user.id)
        const subjects = d.assignments.filter((a) => a.classId === classId).map((a) => a.subjectId)
        visible = visible.filter((m) => (m.classId ? m.classId === classId : subjects.includes(m.subjectId)))
      } else if (user.role === "professor") {
        const mine = assignmentsOf(d, user.id)
        visible = visible.filter(
          (m) => m.uploadedBy === user.id || (m.classId ? mine.some((a) => a.classId === m.classId) : mine.some((a) => a.subjectId === m.subjectId)) || !m.classId,
        )
      }
      return visible
        .map<MaterialView>((m) => ({
          ...m,
          subject: subjectById(d, m.subjectId),
          author: pub(userById(d, m.uploadedBy)),
          className: m.classId ? classById(d, m.classId).name : null,
          canDelete: user.role === "admin" || m.uploadedBy === user.id,
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async saveMaterial(input) {
      await wait()
      if (input.title.trim().length < 3) throw invalid("Informe um título com pelo menos 3 caracteres.")
      if (!input.file && !input.url) throw invalid("Anexe um arquivo ou informe um link.")
      if (input.url && !/^https:\/\//.test(input.url)) throw invalid("Use um link seguro (https://).")
      checkFile(input.file)
      return mutate((d) => {
        const user = me(d)
        requireRole(user, "professor", "admin")
        if (user.role === "professor") {
          const ok = input.classId ? teaches(d, user.id, input.classId, input.subjectId) : assignmentsOf(d, user.id).some((a) => a.subjectId === input.subjectId)
          if (!ok) throw forbidden("Você só pode publicar materiais das disciplinas que leciona.")
        }
        const m = { ...input, title: input.title.trim(), id: uid("mat-"), uploadedBy: user.id, createdAt: now(), file: input.file ?? null, url: input.url ?? null }
        d.materials.push(m)
        const targets = input.classId
          ? studentsOfClass(d, input.classId)
          : d.assignments.filter((a) => a.subjectId === input.subjectId).flatMap((a) => studentsOfClass(d, a.classId))
        notify(d, targets.map((s) => s.id), { kind: "aviso", title: "Novo material na biblioteca", body: m.title, href: "/aluno/biblioteca" })
        return m
      })
    },
    async deleteMaterial(id) {
      await wait()
      mutate((d) => {
        const user = me(d)
        const m = d.materials.find((x) => x.id === id)
        if (!m) throw notFound()
        if (user.role !== "admin" && m.uploadedBy !== user.id) throw forbidden()
        d.materials = d.materials.filter((x) => x.id !== id)
      })
    },

    // ================= Comunicação =================
    async listConversations() {
      await wait()
      const d = db()
      const user = me(d)
      const contacts = new Map(contactsOf(d, user).map((c) => [c.id, c]))
      return d.conversations
        .filter((c) => c.participantIds.includes(user.id))
        .map<ConversationView>((c) => {
          const otherId = c.participantIds.find((p) => p !== user.id)!
          const msgs = d.messages.filter((m) => m.conversationId === c.id)
          const other = userById(d, otherId)
          return {
            ...c,
            other: pub(other),
            subtitle: contacts.get(otherId)?.subtitle ?? (c.subjectId ? subjectById(d, c.subjectId).name : ""),
            lastMessage: msgs.at(-1) ?? null,
            unread: msgs.filter((m) => m.senderId !== user.id && !m.readAt).length,
          }
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    },
    async listMessages(conversationId) {
      await wait()
      const d = db()
      const user = me(d)
      const c = d.conversations.find((x) => x.id === conversationId)
      if (!c || !c.participantIds.includes(user.id)) throw notFound("Conversa não encontrada.")
      return d.messages.filter((m) => m.conversationId === c.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt))
    },
    async sendMessage(conversationId, body) {
      await wait()
      const text = body.trim()
      if (!text) throw invalid("Escreva uma mensagem.")
      if (text.length > 2000) throw invalid("A mensagem pode ter no máximo 2000 caracteres.")
      return mutate((d) => {
        const user = me(d)
        const c = d.conversations.find((x) => x.id === conversationId)
        if (!c || !c.participantIds.includes(user.id)) throw notFound("Conversa não encontrada.")
        const otherId = c.participantIds.find((p) => p !== user.id)!
        if (!contactsOf(d, user).some((x) => x.id === otherId)) throw forbidden("Não há vínculo escolar ativo com este contato.")
        const m = { id: uid("msg-"), conversationId: c.id, senderId: user.id, body: text, createdAt: now(), readAt: null }
        d.messages.push(m)
        c.updatedAt = m.createdAt
        const other = userById(d, otherId)
        if (other) notify(d, [other.id], { kind: "mensagem", title: `Nova mensagem de ${user.name}`, body: text.slice(0, 80), href: `/${other.role}/comunicacao?c=${c.id}` })
        return m
      })
    },
    async startConversation(otherUserId) {
      await wait()
      return mutate((d) => {
        const user = me(d)
        if (!contactsOf(d, user).some((x) => x.id === otherUserId)) throw forbidden("Você só pode conversar com pessoas da sua comunidade escolar.")
        const existing = d.conversations.find((c) => c.participantIds.includes(user.id) && c.participantIds.includes(otherUserId))
        if (existing) return existing
        const c = { id: uid("cnv-"), participantIds: [user.id, otherUserId] as [string, string], subjectId: null, updatedAt: now() }
        d.conversations.push(c)
        return c
      })
    },
    async markConversationRead(conversationId) {
      mutate((d) => {
        const user = me(d)
        const c = d.conversations.find((x) => x.id === conversationId)
        if (!c || !c.participantIds.includes(user.id)) return
        d.messages.forEach((m) => {
          if (m.conversationId === c.id && m.senderId !== user.id && !m.readAt) m.readAt = now()
        })
      })
    },
    async listContacts() {
      await wait()
      const d = db()
      return contactsOf(d, me(d))
    },
    async listAnnouncements() {
      await wait()
      const d = db()
      const user = me(d)
      const myClasses =
        user.role === "aluno" ? [classOfStudent(d, user.id)] : user.role === "professor" ? teacherClassIds(d, user.id) : null
      return d.announcements
        .filter((a) => {
          if (user.role === "admin" || a.authorId === user.id) return true
          if (a.classId && !myClasses?.includes(a.classId)) return false
          if (a.audience === "todos") return true
          return user.role === "aluno" ? a.audience === "alunos" : a.audience === "professores" || Boolean(a.classId)
        })
        .map<AnnouncementView>((a) => ({
          ...a,
          author: pub(userById(d, a.authorId)),
          className: a.classId ? classById(d, a.classId).name : null,
          canDelete: user.role === "admin" || a.authorId === user.id,
        }))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },
    async saveAnnouncement(input) {
      await wait()
      if (input.title.trim().length < 3) throw invalid("Informe um título.")
      if (input.body.trim().length < 5) throw invalid("Escreva o conteúdo do aviso.")
      return mutate((d) => {
        const user = me(d)
        requireRole(user, "professor", "admin")
        if (user.role === "professor" && (!input.classId || !teaches(d, user.id, input.classId)))
          throw forbidden("Professores enviam comunicados apenas para as próprias turmas.")
        const a = { ...input, audience: user.role === "professor" ? ("alunos" as const) : input.audience, id: uid("ann-"), authorId: user.id, createdAt: now() }
        d.announcements.push(a)
        let targets: User[]
        if (a.classId) targets = studentsOfClass(d, a.classId)
        else if (a.audience === "alunos") targets = d.users.filter((u) => u.role === "aluno")
        else if (a.audience === "professores") targets = d.users.filter((u) => u.role === "professor")
        else targets = d.users.filter((u) => u.role !== "admin")
        targets.forEach((t) =>
          notify(d, [t.id], { kind: "aviso", title: a.priority === "importante" ? `Importante: ${a.title}` : a.title, body: a.body.slice(0, 90), href: `/${t.role}/comunicacao?aba=avisos` }),
        )
        return a
      })
    },
    async deleteAnnouncement(id) {
      await wait()
      mutate((d) => {
        const user = me(d)
        const a = d.announcements.find((x) => x.id === id)
        if (!a) throw notFound()
        if (user.role !== "admin" && a.authorId !== user.id) throw forbidden()
        d.announcements = d.announcements.filter((x) => x.id !== id)
      })
    },
    async listNotifications() {
      const d = db()
      const user = me(d)
      return d.notifications.filter((n) => n.userId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 30)
    },
    async markNotificationRead(id) {
      mutate((d) => {
        const user = me(d)
        const n = d.notifications.find((x) => x.id === id && x.userId === user.id)
        if (n) n.read = true
      })
    },
    async markAllNotificationsRead() {
      mutate((d) => {
        const user = me(d)
        d.notifications.forEach((n) => {
          if (n.userId === user.id) n.read = true
        })
      })
    },

    // ================= Gamificação =================
    async listChallenges() {
      await wait()
      const d = db()
      const user = me(d)
      return d.challenges
        .filter((c) => canSeeChallenge(d, user, c))
        .map((c) => challengeView(d, user, c))
        .sort((a, b) => Number(b.isOpen) - Number(a.isOpen) || Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || a.endsAt.localeCompare(b.endsAt))
    },
    async getChallenge(id) {
      await wait()
      const d = db()
      const user = me(d)
      const c = d.challenges.find((x) => x.id === id)
      if (!c || !canSeeChallenge(d, user, c)) throw notFound("Desafio não encontrado.")
      return challengeView(d, user, c)
    },
    async joinChallenge(id) {
      await wait()
      return mutate((d) => participationFor(d, me(d), id).p)
    },
    async toggleChallengeStep(id, step) {
      await wait()
      return mutate((d) => {
        const { c, p } = participationFor(d, me(d), id)
        if (c.kind !== "checklist" || !c.steps || step < 0 || step >= c.steps.length) throw invalid("Etapa inválida.")
        if (p.status === "concluido") return p
        p.completedSteps = p.completedSteps.includes(step) ? p.completedSteps.filter((s) => s !== step) : [...p.completedSteps, step].sort()
        if (p.completedSteps.length === c.steps.length) award(d, p, c)
        return p
      })
    },
    async submitQuiz(id, answers) {
      await wait()
      return mutate((d) => {
        const { c, p } = participationFor(d, me(d), id)
        if (c.kind !== "quiz" || !c.questions) throw invalid("Este desafio não é um quiz.")
        if (answers.length !== c.questions.length || answers.some((a) => a == null || a < 0)) throw invalid("Responda todas as perguntas.")
        const correct = c.questions.filter((q, i) => q.answer === answers[i]).length
        p.attempts += 1
        p.bestScore = Math.max(p.bestScore ?? 0, correct / c.questions.length)
        // Os pontos premiam a participação completa — não o acerto — para não penalizar quem tem dificuldade.
        const pointsAwarded = award(d, p, c)
        return { correct, total: c.questions.length, pointsAwarded, answerKey: c.questions.map((q) => q.answer) }
      })
    },
    async saveChallenge(input) {
      await wait()
      if (input.title.trim().length < 3) throw invalid("Informe um título.")
      if (!(input.points > 0 && input.points <= 500)) throw invalid("A pontuação deve estar entre 1 e 500.")
      validDate(input.endsAt, "Data de encerramento")
      if (input.kind === "checklist" && !input.steps?.filter((s) => s.trim()).length) throw invalid("Adicione pelo menos uma etapa.")
      if (input.kind === "quiz" && !input.questions?.length) throw invalid("Adicione pelo menos uma pergunta.")
      return mutate((d) => {
        const user = me(d)
        requireRole(user, "professor", "admin")
        if (user.role === "professor" && input.classId && !teaches(d, user.id, input.classId)) throw forbidden()
        if (user.role === "professor" && !input.classId) throw forbidden("Escolha uma das suas turmas.")
        const c: Challenge = {
          ...input,
          id: uid("chl-"),
          title: input.title.trim(),
          steps: input.steps?.map((s) => s.trim()).filter(Boolean),
          startsAt: now(),
          createdBy: user.id,
          featured: false,
        }
        d.challenges.push(c)
        const targets = c.classId ? studentsOfClass(d, c.classId) : d.users.filter((u) => u.role === "aluno")
        notify(d, targets.map((t) => t.id), { kind: "desafio", title: "Novo desafio disponível", body: c.title, href: `/aluno/desafios/${c.id}` })
        return c
      })
    },
    async getPointsSummary() {
      await wait()
      const d = db()
      const user = me(d)
      requireRole(user, "aluno")
      const entries = d.points.filter((p) => p.studentId === user.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      const total = entries.reduce((s, e) => s + e.points, 0)
      const done = d.participations.filter((p) => p.studentId === user.id && p.status === "concluido")
      const cat = (category: Challenge["category"]) =>
        done.some((p) => d.challenges.find((c) => c.id === p.challengeId)?.category === category)
      const onTime = d.submissions.filter((s) => {
        const a = d.activities.find((x) => x.id === s.activityId)
        return s.studentId === user.id && a && s.submittedAt <= a.dueAt
      }).length
      const badges: Badge[] = [
        { id: "first", name: "Primeiros passos", description: "Concluiu o primeiro desafio.", earned: done.length > 0, icon: "star" },
        { id: "reader", name: "Leitura em dia", description: "Concluiu um desafio de leitura.", earned: cat("leitura"), icon: "book" },
        { id: "quiz", name: "Mente curiosa", description: "Concluiu um quiz.", earned: cat("quiz"), icon: "brain" },
        { id: "planet", name: "Guardiã(o) do planeta", description: "Concluiu um desafio de sustentabilidade.", earned: cat("sustentabilidade"), icon: "sprout" },
        { id: "science", name: "Cientista", description: "Concluiu um desafio de ciências.", earned: cat("ciencias"), icon: "flask" },
        { id: "streak", name: "Constância", description: "Entregou 10 atividades dentro do prazo.", earned: onTime >= 10, icon: "flame" },
      ]
      const classId = classOfStudent(d, user.id)
      const classGoal = classId
        ? {
            enabled: d.settings.showClassCollectiveGoal,
            current: d.points.filter((p) => classOfStudent(d, p.studentId) === classId).reduce((s, p) => s + p.points, 0),
            goal: d.settings.classGoalPoints,
            className: classById(d, classId).name,
          }
        : null
      return { total, entries, badges, classGoal }
    },

    // ================= Administração =================
    async listUsers(filter) {
      await wait()
      const d = db()
      requireRole(me(d), "admin")
      return d.users
        .filter((u) => !filter?.role || u.role === filter.role)
        .map<UserView>((u) => {
          const classId = u.role === "aluno" ? classOfStudent(d, u.id) : null
          return { ...u, classId, className: classId ? classById(d, classId).name : null, assignmentsCount: assignmentsOf(d, u.id).length }
        })
        .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    },
    async createUser(input) {
      await wait()
      const email = input.email.trim().toLowerCase()
      const d0 = db()
      requireRole(me(d0), "admin")
      if (d0.users.some((u) => u.email.toLowerCase() === email)) throw invalid("Já existe um usuário com este e-mail.")
      if (d0.users.some((u) => u.matricula.toLowerCase() === input.matricula.trim().toLowerCase())) throw invalid("Já existe um usuário com esta matrícula.")
      if (input.role === "aluno" && !input.classId) throw invalid("Selecione a turma do aluno.")
      const salt = randomSalt()
      const hash = await hashPassword(input.password, salt)
      return mutate((d) => {
        const user: User = {
          id: uid("u-"),
          role: input.role,
          name: input.name.trim(),
          email,
          matricula: input.matricula.trim(),
          schoolId: d.schools[0].id,
          avatarColor: ["#1877D2", "#7C4DDB", "#22A06B", "#D9822B", "#0E9AA7", "#D23B6B"][d.users.length % 6],
          active: true,
          createdAt: now(),
          birthDate: input.birthDate ?? null,
          guardianName: input.guardianName ?? null,
          photoDataUrl: null,
          phone: null,
          bio: null,
        }
        d.users.push(user)
        d.credentials.push({ userId: user.id, salt, hash, updatedAt: now() })
        if (input.role === "aluno" && input.classId)
          d.enrollments.push({ id: uid("enr-"), studentId: user.id, classId: input.classId, status: "ativa", createdAt: now() })
        return user
      })
    },
    async updateUser(id, patch) {
      await wait()
      return mutate((d) => {
        requireRole(me(d), "admin")
        const u = d.users.find((x) => x.id === id)
        if (!u) throw notFound("Usuário não encontrado.")
        if (patch.email && d.users.some((x) => x.id !== id && x.email.toLowerCase() === patch.email!.toLowerCase())) throw invalid("E-mail já utilizado.")
        const { classId, ...rest } = patch
        Object.assign(u, rest)
        if (u.role === "aluno" && classId !== undefined) {
          d.enrollments.forEach((e) => {
            if (e.studentId === id && e.status === "ativa") e.status = "transferida"
          })
          if (classId) d.enrollments.push({ id: uid("enr-"), studentId: id, classId, status: "ativa", createdAt: now() })
        }
        return u
      })
    },
    async setUserActive(id, active) {
      await wait()
      mutate((d) => {
        const admin = me(d)
        requireRole(admin, "admin")
        if (id === admin.id) throw invalid("Você não pode desativar o próprio acesso.")
        const u = d.users.find((x) => x.id === id)
        if (!u) throw notFound()
        u.active = active
      })
    },
    async listClasses() {
      await wait()
      const d = db()
      const user = me(d)
      requireRole(user, "admin")
      return d.classes.map((c) => classView(d, user, c.id)).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    },
    async saveClass(input) {
      await wait()
      if (input.name.trim().length < 2) throw invalid("Informe o nome da turma.")
      return mutate((d) => {
        requireRole(me(d), "admin")
        if (input.id) {
          const c = d.classes.find((x) => x.id === input.id)
          if (!c) throw notFound()
          Object.assign(c, input)
          return c
        }
        const c = { ...input, id: uid("cls-"), schoolId: d.schools[0].id }
        d.classes.push(c)
        return c
      })
    },
    async deleteClass(id) {
      await wait()
      mutate((d) => {
        requireRole(me(d), "admin")
        if (d.enrollments.some((e) => e.classId === id && e.status === "ativa"))
          throw invalid("Não é possível excluir uma turma com alunos matriculados. Transfira os alunos antes.")
        d.classes = d.classes.filter((c) => c.id !== id)
        d.assignments = d.assignments.filter((a) => a.classId !== id)
      })
    },
    async listAllSubjects() {
      await wait()
      const d = db()
      me(d)
      return [...d.subjects].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"))
    },
    async saveSubject(input) {
      await wait()
      if (input.name.trim().length < 2) throw invalid("Informe o nome da disciplina.")
      return mutate((d) => {
        requireRole(me(d), "admin")
        if (input.id) {
          const s = d.subjects.find((x) => x.id === input.id)
          if (!s) throw notFound()
          Object.assign(s, input)
          return s
        }
        const s = { ...input, id: uid("sub-") }
        d.subjects.push(s)
        return s
      })
    },
    async deleteSubject(id) {
      await wait()
      mutate((d) => {
        requireRole(me(d), "admin")
        if (d.assignments.some((a) => a.subjectId === id) || d.activities.some((a) => a.subjectId === id))
          throw invalid("A disciplina possui vínculos ou atividades. Remova os vínculos antes de excluir.")
        d.subjects = d.subjects.filter((s) => s.id !== id)
      })
    },
    async listAssignments() {
      await wait()
      const d = db()
      requireRole(me(d), "admin")
      return d.assignments.map<TeachingContext>((a) => ({ assignment: a, schoolClass: classById(d, a.classId), subject: subjectById(d, a.subjectId) }))
    },
    async saveAssignment(input) {
      await wait()
      return mutate((d) => {
        requireRole(me(d), "admin")
        const teacher = userById(d, input.teacherId)
        if (!teacher || teacher.role !== "professor") throw invalid("Selecione um professor válido.")
        const existing = d.assignments.find((a) => a.classId === input.classId && a.subjectId === input.subjectId)
        if (existing) {
          existing.teacherId = input.teacherId
          return existing
        }
        const a = { ...input, id: uid("asg-") }
        d.assignments.push(a)
        return a
      })
    },
    async deleteAssignment(id) {
      await wait()
      mutate((d) => {
        requireRole(me(d), "admin")
        d.assignments = d.assignments.filter((a) => a.id !== id)
      })
    },
    async getSettings() {
      await wait()
      const d = db()
      me(d)
      return d.settings
    },
    async updateSettings(patch) {
      await wait()
      return mutate((d) => {
        requireRole(me(d), "admin")
        d.settings = { ...d.settings, ...patch }
        return d.settings
      })
    },
    async getAdminStats() {
      await wait()
      const d = db()
      requireRole(me(d), "admin")
      const avg = (xs: number[]) => (xs.length ? Math.round((xs.reduce((a, b) => a + b, 0) / xs.length) * 10) / 10 : 0)
      const rate = (classId?: string) => {
        const acts = d.activities.filter((a) => a.status === "publicada" && new Date(a.dueAt) < new Date() && (!classId || a.classId === classId))
        const expected = acts.reduce((s, a) => s + studentsOfClass(d, a.classId).length, 0)
        const got = d.submissions.filter((s) => acts.some((a) => a.id === s.activityId)).length
        return expected ? Math.round((got / expected) * 100) : 0
      }
      const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
      return {
        students: d.users.filter((u) => u.role === "aluno" && u.active).length,
        teachers: d.users.filter((u) => u.role === "professor" && u.active).length,
        classes: d.classes.length,
        subjects: d.subjects.length,
        activities: d.activities.length,
        submissionRate: rate(),
        averageGrade: avg(d.grades.map((g) => (g.score / g.maxScore) * 10)),
        activeChallenges: d.challenges.filter((c) => new Date(c.endsAt) >= new Date()).length,
        messagesThisWeek: d.messages.filter((m) => m.createdAt >= weekAgo).length,
        byClass: d.classes.map((c) => ({
          className: c.name,
          students: studentsOfClass(d, c.id).length,
          average: avg(d.grades.filter((g) => g.classId === c.id).map((g) => (g.score / g.maxScore) * 10)),
          submissionRate: rate(c.id),
        })),
        bySubject: d.subjects.map((s) => ({
          subject: s.name,
          color: s.color,
          average: avg(d.grades.filter((g) => g.subjectId === s.id).map((g) => (g.score / g.maxScore) * 10)),
        })),
      } satisfies AdminStats
    },

    async resetDemo() {
      storage.reset()
    },
  }

  function classView(d: DemoDB, user: User, classId: string): ClassView {
    const c = classById(d, classId)
    const teachers = d.assignments
      .filter((a) => a.classId === classId)
      .map((a) => ({ teacher: pub(userById(d, a.teacherId)), subject: subjectById(d, a.subjectId) }))
    return {
      ...c,
      students: studentsOfClass(d, classId).length,
      teachers,
      mySubjects: teachers.filter((t) => t.teacher.id === user.id).map((t) => t.subject),
    }
  }

  return repo
}
