import { beforeEach, describe, expect, it } from "vitest"
import { AppError } from "@/lib/data/repository"
import { createDemoRepository } from "./demo-repository"
import { createSeed, DEMO_ACCOUNTS, DEMO_PASSWORD_HINT } from "./seed"
import { memorySession, memoryStorage } from "./storage"

function setup() {
  const session = memorySession()
  const repo = createDemoRepository({ storage: memoryStorage(createSeed()), session })
  return { repo, session }
}

const as = async (repo: ReturnType<typeof setup>["repo"], role: "aluno" | "professor" | "admin") => repo.signInDemo(role)
const forbidden = expect.objectContaining({ code: "forbidden" })

describe("autenticação", () => {
  it("entra por e-mail ou matrícula e rejeita senha errada sem revelar o motivo", async () => {
    const { repo } = setup()
    await expect(repo.signIn(DEMO_ACCOUNTS.aluno.matricula, "errada", false)).rejects.toThrow("E-mail/matrícula ou senha incorretos.")
    const user = await repo.signIn(DEMO_ACCOUNTS.aluno.email.toUpperCase(), DEMO_PASSWORD_HINT, true)
    expect(user.role).toBe("aluno")
  })

  it("bloqueia temporariamente após 5 tentativas erradas", async () => {
    const { repo } = setup()
    for (let i = 0; i < 5; i++) await expect(repo.signIn("2025090101", "x", false)).rejects.toBeInstanceOf(AppError)
    await expect(repo.signIn("2025090101", DEMO_PASSWORD_HINT, false)).rejects.toThrow(/Muitas tentativas/)
  })

  it("não guarda senha em texto simples", () => {
    const db = createSeed()
    expect(JSON.stringify(db.credentials)).not.toContain(DEMO_PASSWORD_HINT)
    expect(db.credentials[0].hash).toMatch(/^[0-9a-f]{64}$/)
  })
})

describe("aluno", () => {
  let ctx: ReturnType<typeof setup>
  beforeEach(async () => {
    ctx = setup()
    await as(ctx.repo, "aluno")
  })

  it("vê apenas as próprias notas e as atividades da própria turma", async () => {
    const grades = await ctx.repo.listGrades()
    expect(grades.length).toBeGreaterThan(0)
    expect(new Set(grades.map((g) => g.studentId))).toEqual(new Set([DEMO_ACCOUNTS.aluno.id]))
    const acts = await ctx.repo.listActivities()
    expect(acts.every((a) => a.classId === "cls-9a" && a.status === "publicada")).toBe(true)
  })

  it("indicadores do painel batem com o protótipo (5 pendentes, 12 concluídas, 320 pontos)", async () => {
    const acts = await ctx.repo.listActivities()
    expect(acts.filter((a) => a.studentStatus === "pendente" || a.studentStatus === "atrasada")).toHaveLength(5)
    expect(acts.filter((a) => a.studentStatus === "entregue" || a.studentStatus === "corrigida")).toHaveLength(12)
    expect((await ctx.repo.getPointsSummary()).total).toBe(320)
  })

  it("não lança notas nem acessa atividades de outra turma", async () => {
    await expect(
      ctx.repo.saveGrade({ studentId: DEMO_ACCOUNTS.aluno.id, subjectId: "sub-mat", classId: "cls-9a", term: 1, label: "Forjada", score: 10, maxScore: 10 }),
    ).rejects.toEqual(forbidden)
    await expect(ctx.repo.getActivity("act-cls-9b-1")).rejects.toThrow("Atividade não encontrada.")
    await expect(ctx.repo.submitActivity("act-cls-9b-1", { text: "x" })).rejects.toBeInstanceOf(AppError)
  })

  it("só conversa com professores da turma e com a coordenação", async () => {
    const contacts = await ctx.repo.listContacts()
    expect(contacts.every((c) => c.role !== "aluno")).toBe(true)
    await expect(ctx.repo.startConversation("u-st-13")).rejects.toEqual(forbidden)
  })

  it("quiz concede pontos uma única vez, pela participação (não pelo acerto)", async () => {
    const first = await ctx.repo.submitQuiz("chl-quiz-mat", [0, 0, 1, 1, 0])
    expect(first.correct).toBeLessThan(5)
    expect(first.pointsAwarded).toBe(50)
    const second = await ctx.repo.submitQuiz("chl-quiz-mat", [1, 2, 0, 2, 1])
    expect(second.correct).toBe(5)
    expect(second.pointsAwarded).toBe(0)
    expect((await ctx.repo.getPointsSummary()).total).toBe(370)
  })

  it("não altera o próprio nome (dado cadastral)", async () => {
    const user = await ctx.repo.updateMyProfile({ name: "Outro Nome", bio: "Nova bio" })
    expect(user.name).toBe("Maria Oliveira")
    expect(user.bio).toBe("Nova bio")
  })
})

describe("professor", () => {
  it("só gerencia as turmas e disciplinas que leciona", async () => {
    const { repo } = setup()
    await as(repo, "professor")
    const acts = await repo.listActivities()
    expect(acts.every((a) => a.subjectId === "sub-mat" || a.subjectId === "sub-cie")).toBe(true)
    await expect(
      repo.saveActivity({ title: "Invasão", description: "x", type: "tarefa", classId: "cls-9a", subjectId: "sub-por", dueAt: new Date().toISOString(), maxScore: 10, status: "publicada" }),
    ).rejects.toEqual(forbidden)
    await expect(
      repo.saveGrade({ studentId: "u-st-13", subjectId: "sub-por", classId: "cls-9b", term: 1, label: "P1", score: 7, maxScore: 10 }),
    ).rejects.toEqual(forbidden)
  })

  it("fluxo completo: cria atividade → aluno entrega → professor corrige → aluno vê a nota", async () => {
    const { repo } = setup()
    await as(repo, "professor")
    const act = await repo.saveActivity({ title: "Lista nova", description: "Resolva", type: "tarefa", classId: "cls-9a", subjectId: "sub-mat", dueAt: new Date(Date.now() + 86400000).toISOString(), maxScore: 10, status: "publicada" })
    await as(repo, "aluno")
    await repo.submitActivity(act.id, { text: "Minha resposta" })
    await as(repo, "professor")
    const [sub] = await repo.listSubmissions(act.id)
    await expect(repo.gradeSubmission(sub.id, { score: 11, feedback: "" })).rejects.toThrow(/entre 0 e 10/)
    await repo.gradeSubmission(sub.id, { score: 9.5, feedback: "Muito bem" })
    await as(repo, "aluno")
    const view = await repo.getActivity(act.id)
    expect(view.studentStatus).toBe("corrigida")
    expect(view.mySubmission?.score).toBe(9.5)
    await expect(repo.submitActivity(act.id, { text: "nova versão" })).rejects.toThrow(/já foi corrigida/)
    expect((await repo.listNotifications()).some((n) => n.title === "Atividade corrigida")).toBe(true)
  })
})

describe("administração", () => {
  it("gerencia cadastros, mas não altera notas (menor privilégio)", async () => {
    const { repo } = setup()
    await as(repo, "admin")
    const user = await repo.createUser({ role: "aluno", name: "Aluno Novo", email: "novo@x.com", matricula: "2026999", password: "Senha1234", classId: "cls-9b" })
    expect((await repo.listUsers({ role: "aluno" })).find((u) => u.id === user.id)?.className).toBe("9º Ano B")
    await expect(repo.createUser({ role: "aluno", name: "Dup", email: "novo@x.com", matricula: "1", password: "Senha1234", classId: "cls-9b" })).rejects.toThrow(/e-mail/)
    await expect(
      repo.saveGrade({ studentId: DEMO_ACCOUNTS.aluno.id, subjectId: "sub-mat", classId: "cls-9a", term: 1, label: "Admin", score: 10, maxScore: 10 }),
    ).rejects.toEqual(forbidden)
    await expect(repo.deleteClass("cls-9a")).rejects.toThrow(/alunos matriculados/)
  })

  it("usuário desativado não consegue entrar", async () => {
    const { repo } = setup()
    await as(repo, "admin")
    await repo.setUserActive(DEMO_ACCOUNTS.aluno.id, false)
    await expect(repo.signIn(DEMO_ACCOUNTS.aluno.email, DEMO_PASSWORD_HINT, false)).rejects.toThrow(/desativado/)
  })
})
