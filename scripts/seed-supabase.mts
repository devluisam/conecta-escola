/**
 * Popula um projeto Supabase com os dados FICTÍCIOS de demonstração.
 *
 * Uso (Node 22.6+ executa TypeScript direto):
 *   node --env-file=.env.local scripts/seed-supabase.mts
 *
 * Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY. Use somente em
 * projetos de teste/homologação — nunca em um banco com dados reais de alunos.
 * Todos os logins criados usam a senha de demonstração "Demo@2025".
 */
import { createClient } from "@supabase/supabase-js"
import { createSeed, DEMO_PASSWORD_HINT } from "../src/lib/demo/seed.ts"

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error("Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (ex.: em .env.local).")
  process.exit(1)
}
const sb = createClient(url, key, { auth: { persistSession: false } })
const db = createSeed()

const ids = new Map<string, string>()
const id = (demoId: string | null | undefined) => {
  if (!demoId) return null
  if (!ids.has(demoId)) ids.set(demoId, crypto.randomUUID())
  return ids.get(demoId)!
}
async function insert(table: string, rows: Record<string, unknown>[]) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await sb.from(table).insert(rows.slice(i, i + 500))
    if (error) throw new Error(`${table}: ${error.message}`)
  }
  console.log(`  ${table}: ${rows.length}`)
}

async function main() {
  const { count } = await sb.from("profiles").select("id", { count: "exact", head: true })
  if (count) {
    console.error(`O banco já tem ${count} perfis. Abortando para não misturar dados.`)
    process.exit(1)
  }
  console.log("Criando logins no Supabase Auth…")
  for (const u of db.users) {
    const { data, error } = await sb.auth.admin.createUser({ email: u.email, password: DEMO_PASSWORD_HINT, email_confirm: true })
    if (error || !data.user) throw new Error(`auth ${u.email}: ${error?.message}`)
    ids.set(u.id, data.user.id)
  }
  console.log("Inserindo dados…")
  await insert("schools", db.schools.map((s) => ({ id: id(s.id), name: s.name, city: s.city, inep: s.inep })))
  const st = db.settings
  await insert("school_settings", [{
    school_id: id(db.schools[0].id), school_year: st.schoolYear, current_term: st.currentTerm, passing_grade: st.passingGrade,
    allow_student_to_student_messages: st.allowStudentToStudentMessages, show_class_collective_goal: st.showClassCollectiveGoal,
    class_goal_points: st.classGoalPoints, max_upload_mb: st.maxUploadMb,
  }])
  await insert("profiles", db.users.map((u) => ({
    id: id(u.id), school_id: id(u.schoolId), role: u.role, name: u.name, email: u.email, matricula: u.matricula,
    avatar_color: u.avatarColor, birth_date: u.birthDate, guardian_name: u.guardianName, bio: u.bio, pronoun: u.pronoun ?? null, active: u.active,
  })))
  await insert("classes", db.classes.map((c) => ({ id: id(c.id), school_id: id(c.schoolId), name: c.name, series: c.series, shift: c.shift, year: c.year, room: c.room })))
  await insert("subjects", db.subjects.map((s) => ({ id: id(s.id), name: s.name, code: s.code, color: s.color, workload: s.workload })))
  await insert("enrollments", db.enrollments.map((e) => ({ student_id: id(e.studentId), class_id: id(e.classId), status: e.status })))
  await insert("teaching_assignments", db.assignments.map((a) => ({ teacher_id: id(a.teacherId), class_id: id(a.classId), subject_id: id(a.subjectId) })))
  await insert("activities", db.activities.map((a) => ({
    id: id(a.id), title: a.title, description: a.description, type: a.type, subject_id: id(a.subjectId), class_id: id(a.classId),
    teacher_id: id(a.teacherId), due_at: a.dueAt, max_score: a.maxScore, status: a.status, created_at: a.createdAt,
  })))
  await insert("submissions", db.submissions.map((s) => ({
    activity_id: id(s.activityId), student_id: id(s.studentId), text: s.text, submitted_at: s.submittedAt, status: s.status,
    score: s.score, feedback: s.feedback, graded_at: s.gradedAt,
  })))
  await insert("grades", db.grades.map((g) => ({
    student_id: id(g.studentId), subject_id: id(g.subjectId), class_id: id(g.classId), teacher_id: id(g.teacherId),
    term: g.term, label: g.label, score: g.score, max_score: g.maxScore, created_at: g.createdAt, updated_at: g.updatedAt,
  })))
  await insert("events", db.events.map((e) => ({
    title: e.title, type: e.type, starts_at: e.startsAt, ends_at: e.endsAt, all_day: Boolean(e.allDay), subject_id: id(e.subjectId),
    class_id: id(e.classId), location: e.location, description: e.description, created_by: id(e.createdBy),
  })))
  // Arquivos de exemplo ficam em /public/materiais (públicos e fictícios).
  await insert("materials", db.materials.map((m) => ({
    title: m.title, description: m.description, type: m.type, subject_id: id(m.subjectId), class_id: id(m.classId), file: m.file,
    url: m.url, downloadable: m.downloadable, uploaded_by: id(m.uploadedBy), pages: m.pages, created_at: m.createdAt,
  })))
  await insert("conversations", db.conversations.map((c) => {
    const [a, b] = c.participantIds.map((p) => id(p)!).sort()
    return { id: id(c.id), participant_a: a, participant_b: b, subject_id: id(c.subjectId), updated_at: c.updatedAt }
  }))
  await insert("messages", db.messages.map((m) => ({ conversation_id: id(m.conversationId), sender_id: id(m.senderId), body: m.body, created_at: m.createdAt, read_at: m.readAt })))
  await insert("announcements", db.announcements.map((a) => ({
    title: a.title, body: a.body, author_id: id(a.authorId), audience: a.audience, class_id: id(a.classId), priority: a.priority, created_at: a.createdAt,
  })))
  await insert("challenges", db.challenges.map((c) => ({
    id: id(c.id), title: c.title, description: c.description, category: c.category, kind: c.kind, points: c.points,
    starts_at: c.startsAt, ends_at: c.endsAt, class_id: id(c.classId), subject_id: id(c.subjectId), featured: Boolean(c.featured), created_by: id(c.createdBy),
    questions: c.questions?.map((q) => ({ prompt: q.prompt, options: q.options, explanation: q.explanation ?? null })) ?? null,
    answer_key: c.questions?.map((q) => q.answer) ?? null,
    steps: c.steps ?? null,
  })))
  await insert("challenge_participations", db.participations.map((p) => ({
    challenge_id: id(p.challengeId), student_id: id(p.studentId), status: p.status, completed_steps: p.completedSteps,
    best_score: p.bestScore ?? null, attempts: p.attempts, points_awarded: p.pointsAwarded, started_at: p.startedAt, completed_at: p.completedAt ?? null,
  })))
  await insert("point_entries", db.points.map((p) => ({ student_id: id(p.studentId), points: p.points, reason: p.reason, challenge_id: id(p.challengeId), created_at: p.createdAt })))
  // Os gatilhos geram notificações durante o seed; recomeça a caixa de entrada limpa.
  await sb.from("notifications").delete().neq("id", "00000000-0000-0000-0000-000000000000")
  console.log(`\nPronto! Entre com qualquer e-mail @demo.conectaescola.app e a senha ${DEMO_PASSWORD_HINT}.`)
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err)
  process.exit(1)
})
