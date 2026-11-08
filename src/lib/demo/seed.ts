/**
 * Dados FICTÍCIOS de demonstração. Nenhum nome, matrícula ou contato pertence
 * a estudantes reais. As datas são geradas a partir de "agora", para que a
 * agenda e os prazos estejam sempre preenchidos no dia da apresentação.
 */
import type {
  Activity,
  Announcement,
  CalendarEvent,
  Challenge,
  ChallengeParticipation,
  Conversation,
  Credential,
  Enrollment,
  Grade,
  Material,
  Message,
  Notification,
  PointEntry,
  School,
  SchoolClass,
  SchoolSettings,
  Subject,
  Submission,
  TeachingAssignment,
  User,
} from "@/lib/types"

export interface DemoDB {
  version: number
  seededAt: string
  schools: School[]
  users: User[]
  credentials: Credential[]
  classes: SchoolClass[]
  enrollments: Enrollment[]
  subjects: Subject[]
  assignments: TeachingAssignment[]
  activities: Activity[]
  submissions: Submission[]
  grades: Grade[]
  events: CalendarEvent[]
  materials: Material[]
  conversations: Conversation[]
  messages: Message[]
  announcements: Announcement[]
  notifications: Notification[]
  challenges: Challenge[]
  participations: ChallengeParticipation[]
  points: PointEntry[]
  settings: SchoolSettings
}

export const DEMO_DB_VERSION = 3

/** Senha de todos os perfis de demonstração: "Demo@2025" (apenas o hash fica aqui). */
const DEMO_SALT = "5f1c9a2e7b3d4c6a8e0f1a2b3c4d5e6f"
const DEMO_HASH = "402579828f38ab7bdc20d9b326feb422ff27efc9f1efcdbb62efcca7cf8fcf2d"

export const DEMO_ACCOUNTS = {
  aluno: { id: "u-maria", email: "maria.oliveira@demo.conectaescola.app", matricula: "2025090101" },
  professor: { id: "u-carlos", email: "carlos.mendes@demo.conectaescola.app", matricula: "PROF-0412" },
  admin: { id: "u-patricia", email: "patricia.nogueira@demo.conectaescola.app", matricula: "ADM-0007" },
} as const

export const DEMO_PASSWORD_HINT = "Demo@2025"

function mulberry32(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function currentTermFor(date: Date): 1 | 2 | 3 | 4 {
  const m = date.getMonth()
  if (m <= 3) return 1
  if (m <= 6) return 2
  if (m <= 8) return 3
  return 4
}

export function createSeed(now = new Date()): DemoDB {
  const rand = mulberry32(2025)
  const iso = (d: Date) => d.toISOString()
  /** Data relativa a hoje, em dias, com hora local fixa. */
  const at = (days: number, hour = 9, minute = 0) => {
    const d = new Date(now)
    d.setDate(d.getDate() + days)
    d.setHours(hour, minute, 0, 0)
    return d
  }
  const created = iso(at(-120))
  const year = now.getFullYear()
  const term = currentTermFor(now)

  const school: School = {
    id: "sch-1",
    name: "Escola Estadual Horizonte Azul",
    city: "Manaus – AM",
    inep: "00000000 (fictício)",
  }

  const subjects: Subject[] = [
    { id: "sub-mat", name: "Matemática", code: "MAT", color: "#1877D2", workload: 200 },
    { id: "sub-por", name: "Língua Portuguesa", code: "POR", color: "#7C4DDB", workload: 200 },
    { id: "sub-cie", name: "Ciências", code: "CIE", color: "#22A06B", workload: 120 },
    { id: "sub-his", name: "História", code: "HIS", color: "#D9822B", workload: 80 },
    { id: "sub-geo", name: "Geografia", code: "GEO", color: "#0E9AA7", workload: 80 },
    { id: "sub-ing", name: "Inglês", code: "ING", color: "#D23B6B", workload: 80 },
  ]

  const classes: SchoolClass[] = [
    { id: "cls-9a", schoolId: school.id, name: "9º Ano A", series: "9º ano – Ensino Fundamental", shift: "Manhã", year, room: "Sala 12" },
    { id: "cls-9b", schoolId: school.id, name: "9º Ano B", series: "9º ano – Ensino Fundamental", shift: "Tarde", year, room: "Sala 12" },
    { id: "cls-1a", schoolId: school.id, name: "1ª Série A", series: "1ª série – Ensino Médio", shift: "Manhã", year, room: "Sala 21" },
  ]

  const palette = ["#1877D2", "#7C4DDB", "#22A06B", "#D9822B", "#0E9AA7", "#D23B6B", "#5B6B82", "#B7791F"]
  const mkUser = (u: Partial<User> & Pick<User, "id" | "role" | "name" | "email" | "matricula">, i: number): User => ({
    schoolId: school.id,
    avatarColor: palette[i % palette.length],
    active: true,
    createdAt: created,
    photoDataUrl: null,
    phone: null,
    birthDate: null,
    guardianName: null,
    bio: null,
    ...u,
  })

  const staff: User[] = [
    mkUser({ ...DEMO_ACCOUNTS.admin, role: "admin", name: "Patrícia Nogueira", bio: "Coordenação pedagógica e secretaria escolar." }, 6),
    mkUser({ ...DEMO_ACCOUNTS.professor, role: "professor", name: "Carlos Mendes", bio: "Professor de Matemática e Ciências. Gosta de ensinar com jogos e experimentos." }, 0),
    mkUser({ id: "u-juliana", role: "professor", name: "Juliana Rocha", email: "juliana.rocha@demo.conectaescola.app", matricula: "PROF-0388" }, 1),
    mkUser({ id: "u-roberto", role: "professor", name: "Roberto Lima", email: "roberto.lima@demo.conectaescola.app", matricula: "PROF-0291" }, 3),
    mkUser({ id: "u-fernanda", role: "professor", name: "Fernanda Alves", email: "fernanda.alves@demo.conectaescola.app", matricula: "PROF-0455" }, 5),
  ]

  const studentNames: Record<string, string[]> = {
    "cls-9a": [
      "Maria Oliveira", "João Pedro Santos", "Ana Clara Souza", "Lucas Ferreira", "Beatriz Costa", "Gabriel Almeida",
      "Larissa Martins", "Pedro Henrique Silva", "Isabela Ribeiro", "Rafael Gomes", "Sofia Carvalho", "Matheus Araújo",
    ],
    "cls-9b": ["Davi Barbosa", "Yasmin Pereira", "Enzo Rodrigues", "Lívia Cardoso", "Miguel Teixeira", "Helena Duarte", "Arthur Moreira", "Valentina Lopes"],
    "cls-1a": ["Nicolas Freitas", "Manuela Pinto", "Samuel Correia", "Alice Monteiro", "Heitor Batista"],
  }

  const students: User[] = []
  const enrollments: Enrollment[] = []
  let seq = 1
  for (const [classId, names] of Object.entries(studentNames)) {
    names.forEach((name, idx) => {
      const isMaria = name === "Maria Oliveira"
      const slug = name
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .split(" ")
      const id = isMaria ? DEMO_ACCOUNTS.aluno.id : `u-st-${seq}`
      students.push(
        mkUser(
          {
            id,
            role: "aluno",
            name,
            email: isMaria ? DEMO_ACCOUNTS.aluno.email : `${slug[0]}.${slug[slug.length - 1]}@demo.conectaescola.app`,
            matricula: isMaria ? DEMO_ACCOUNTS.aluno.matricula : `${year}09${String(seq + 1).padStart(4, "0")}`,
            birthDate: isMaria ? `${year - 14}-03-18` : `${year - 14 - (classId === "cls-1a" ? 1 : 0)}-0${(idx % 9) + 1}-1${idx % 9}`,
            guardianName: isMaria ? "Responsável fictício (Sra. Oliveira)" : "Responsável fictício",
            pronoun: isMaria ? "ela" : null,
            bio: isMaria ? "Gosto de leitura, ciências e de participar dos desafios da turma." : null,
          },
          seq,
        ),
      )
      enrollments.push({ id: `enr-${seq}`, studentId: id, classId, status: "ativa", createdAt: created })
      seq++
    })
  }

  const users = [...staff, ...students]
  const credentials: Credential[] = users.map((u) => ({ userId: u.id, salt: DEMO_SALT, hash: DEMO_HASH, updatedAt: created }))

  const A = (teacherId: string, classId: string, subjectId: string): TeachingAssignment => ({
    id: `asg-${classId}-${subjectId}`,
    teacherId,
    classId,
    subjectId,
  })
  const assignments: TeachingAssignment[] = [
    A("u-carlos", "cls-9a", "sub-mat"),
    A("u-carlos", "cls-9b", "sub-mat"),
    A("u-carlos", "cls-9a", "sub-cie"),
    A("u-juliana", "cls-9a", "sub-por"),
    A("u-juliana", "cls-9b", "sub-por"),
    A("u-roberto", "cls-9a", "sub-his"),
    A("u-roberto", "cls-9a", "sub-geo"),
    A("u-roberto", "cls-9b", "sub-his"),
    A("u-fernanda", "cls-9a", "sub-ing"),
    A("u-fernanda", "cls-9b", "sub-cie"),
    A("u-fernanda", "cls-1a", "sub-ing"),
    A("u-carlos", "cls-1a", "sub-mat"),
  ]
  const teacherOf = (classId: string, subjectId: string) =>
    assignments.find((a) => a.classId === classId && a.subjectId === subjectId)?.teacherId ?? "u-carlos"

  // ---------------- Atividades ----------------
  type Act = [string, Activity["type"], string, number, string]
  // [título, tipo, disciplina, dias relativos ao prazo, descrição]
  const nineA: Act[] = [
    ["Lista de equações do 1º grau", "tarefa", "sub-mat", -40, "Resolva os 15 exercícios da lista, mostrando o desenvolvimento."],
    ["Resumo: Era Vargas", "trabalho", "sub-his", -36, "Produza um resumo de uma página sobre as principais medidas do período."],
    ["Redação: o papel da escola", "trabalho", "sub-por", -33, "Texto dissertativo-argumentativo de 20 a 30 linhas."],
    ["Relatório: densidade dos materiais", "trabalho", "sub-cie", -29, "Relate o experimento feito no laboratório, com hipótese e conclusão."],
    ["Mapa dos biomas brasileiros", "tarefa", "sub-geo", -26, "Monte um mapa ilustrado com os seis biomas e suas características."],
    ["Vocabulary quiz – Unit 4", "questionario", "sub-ing", -22, "Questionário de vocabulário sobre profissões."],
    ["Sistemas de equações – exercícios", "tarefa", "sub-mat", -19, "Exercícios 1 a 12 da página 84 do livro."],
    ["Análise de poema modernista", "tarefa", "sub-por", -15, "Analise os recursos expressivos do poema indicado em sala."],
    ["Linha do tempo: Guerra Fria", "trabalho", "sub-his", -12, "Linha do tempo com no mínimo 10 acontecimentos."],
    ["Tabela periódica – famílias", "tarefa", "sub-cie", -9, "Classifique os 20 elementos da lista por família e período."],
    ["Funções do 1º grau – gráficos", "tarefa", "sub-mat", -6, "Construa os gráficos das funções da lista no papel quadriculado."],
    ["Present perfect – exercises", "tarefa", "sub-ing", -3, "Complete as frases usando o present perfect."],
    ["Relatório da visita ao Bosque da Ciência", "trabalho", "sub-cie", -1, "Relate em grupo o que foi observado na visita de campo."],
    ["Lista: teorema de Pitágoras", "tarefa", "sub-mat", 2, "Resolva os problemas contextualizados de 1 a 10."],
    ["Entrega de Trabalho – História: Revolução Industrial", "trabalho", "sub-his", 3, "Trabalho em dupla com capa, introdução, desenvolvimento e referências."],
    ["Leitura: capítulo 5 de \"O Pequeno Príncipe\"", "tarefa", "sub-por", 5, "Leia o capítulo e responda às 5 perguntas de interpretação."],
    ["Pesquisa: fontes de energia renováveis", "trabalho", "sub-geo", 9, "Pesquise uma fonte renovável usada no Amazonas e apresente em 5 slides."],
  ]
  const nineB: Act[] = [
    ["Lista de equações do 1º grau", "tarefa", "sub-mat", -38, "Resolva os 15 exercícios da lista, mostrando o desenvolvimento."],
    ["Sistemas de equações – exercícios", "tarefa", "sub-mat", -10, "Exercícios 1 a 12 da página 84 do livro."],
    ["Funções do 1º grau – gráficos", "tarefa", "sub-mat", -2, "Construa os gráficos das funções da lista no papel quadriculado."],
    ["Lista: teorema de Pitágoras", "tarefa", "sub-mat", 4, "Resolva os problemas contextualizados de 1 a 10."],
    ["Interpretação de texto – crônica", "tarefa", "sub-por", 6, "Leia a crônica e responda às questões."],
  ]
  const activities: Activity[] = []
  const pushActs = (list: Act[], classId: string) =>
    list.forEach(([title, type, subjectId, days, description], i) => {
      activities.push({
        id: `act-${classId}-${i + 1}`,
        title,
        description,
        type,
        subjectId,
        classId,
        teacherId: teacherOf(classId, subjectId),
        dueAt: iso(at(days, 23, 59)),
        maxScore: type === "trabalho" ? 10 : type === "prova" ? 10 : 5,
        status: "publicada",
        attachment: null,
        createdAt: iso(at(days - 10, 8)),
      })
    })
  pushActs(nineA, "cls-9a")
  pushActs(nineB, "cls-9b")

  // ---------------- Entregas ----------------
  const submissions: Submission[] = []
  const classStudents = (classId: string) => enrollments.filter((e) => e.classId === classId).map((e) => e.studentId)
  for (const act of activities) {
    const due = new Date(act.dueAt).getTime()
    const isPast = due < now.getTime()
    const roster = classStudents(act.classId)
    roster.forEach((studentId, idx) => {
      const isMaria = studentId === DEMO_ACCOUNTS.aluno.id
      const actIndex = Number(act.id.split("-").pop())
      if (isMaria) {
        // Maria: 12 concluídas, 1 atrasada (índice 13), 4 a fazer.
        if (!isPast || actIndex === 13) return
        const graded = actIndex <= 11
        const score = Math.round(act.maxScore * (0.72 + rand() * 0.26) * 10) / 10
        submissions.push({
          id: `sbm-${act.id}-${studentId}`,
          activityId: act.id,
          studentId,
          text: "Segue minha resposta conforme as orientações da atividade.",
          file: null,
          submittedAt: new Date(due - 1000 * 60 * 60 * (6 + idx)).toISOString(),
          status: graded ? "corrigida" : "entregue",
          score: graded ? score : null,
          feedback: graded ? (score / act.maxScore > 0.85 ? "Excelente trabalho, continue assim!" : "Bom trabalho! Revise os pontos marcados.") : null,
          gradedAt: graded ? new Date(due + 1000 * 60 * 60 * 48).toISOString() : null,
        })
        return
      }
      // Demais alunos: a maioria entrega; parte das entregas recentes aguarda correção.
      const delivered = isPast ? rand() > 0.12 : rand() > 0.75
      if (!delivered) return
      const recent = due > at(-8).getTime()
      const graded = isPast && !recent
      const score = Math.round(act.maxScore * (0.5 + rand() * 0.5) * 10) / 10
      submissions.push({
        id: `sbm-${act.id}-${studentId}`,
        activityId: act.id,
        studentId,
        text: "Atividade entregue pelo aluno (conteúdo fictício de demonstração).",
        file: null,
        submittedAt: new Date(Math.min(due, now.getTime()) - 1000 * 60 * 60 * (3 + idx)).toISOString(),
        status: graded ? "corrigida" : "entregue",
        score: graded ? score : null,
        feedback: graded ? "Correção registrada." : null,
        gradedAt: graded ? new Date(due + 1000 * 60 * 60 * 72).toISOString() : null,
      })
    })
  }

  // ---------------- Notas (boletim) ----------------
  const grades: Grade[] = []
  const labels = ["Avaliação 1", "Avaliação 2", "Trabalho"]
  for (const enr of enrollments) {
    const classSubjects = assignments.filter((a) => a.classId === enr.classId)
    const isMaria = enr.studentId === DEMO_ACCOUNTS.aluno.id
    const base = isMaria ? 7.4 : 5.2 + rand() * 3.2
    for (const asg of classSubjects) {
      for (let t = 1; t <= term; t++) {
        const count = t === term ? 1 : 3
        for (let k = 0; k < count; k++) {
          const trend = isMaria ? (t - 1) * 0.35 : (rand() - 0.4) * 0.6
          const score = Math.max(3, Math.min(10, Math.round((base + trend + (rand() - 0.5) * 1.6) * 10) / 10))
          grades.push({
            id: `grd-${enr.studentId}-${asg.subjectId}-${t}-${k}`,
            studentId: enr.studentId,
            subjectId: asg.subjectId,
            classId: enr.classId,
            teacherId: asg.teacherId,
            term: t as Grade["term"],
            label: labels[k],
            score,
            maxScore: 10,
            createdAt: iso(at(-30 * (term - t) - 10 + k * 3)),
            updatedAt: iso(at(-30 * (term - t) - 10 + k * 3)),
          })
        }
      }
    }
  }

  // ---------------- Agenda ----------------
  const ev = (
    id: string,
    title: string,
    type: CalendarEvent["type"],
    days: number,
    hour: number,
    durationMin: number,
    extra: Partial<CalendarEvent> = {},
  ): CalendarEvent => {
    const start = at(days, hour)
    return {
      id,
      title,
      type,
      startsAt: iso(start),
      endsAt: iso(new Date(start.getTime() + durationMin * 60000)),
      createdBy: "u-patricia",
      classId: null,
      subjectId: null,
      location: null,
      description: null,
      ...extra,
    }
  }
  const events: CalendarEvent[] = [
    ev("evt-1", "Prova de Matemática", "prova", 1, 9, 90, { classId: "cls-9a", subjectId: "sub-mat", createdBy: "u-carlos", location: "Sala 12", description: "Conteúdo: equações, sistemas e funções do 1º grau." }),
    ev("evt-2", "Aula de Ciências – laboratório", "aula", 4, 10, 100, { classId: "cls-9a", subjectId: "sub-cie", createdBy: "u-carlos", location: "Laboratório de Ciências", description: "Experimento sobre reações químicas. Trazer jaleco." }),
    ev("evt-3", "Prova de Língua Portuguesa", "prova", 7, 8, 90, { classId: "cls-9a", subjectId: "sub-por", createdBy: "u-juliana", location: "Sala 12" }),
    ev("evt-4", "Feira de Ciências e Sustentabilidade", "evento", 12, 8, 240, { location: "Quadra coberta", description: "Apresentação dos projetos das turmas. Aberto às famílias." }),
    ev("evt-5", "Reunião de pais e responsáveis", "evento", 6, 18, 90, { location: "Auditório", description: "Entrega de boletins do bimestre." }),
    ev("evt-6", "Prova de História", "prova", 10, 9, 90, { classId: "cls-9a", subjectId: "sub-his", createdBy: "u-roberto", location: "Sala 12" }),
    ev("evt-7", "Aula de campo – Bosque da Ciência", "aula", -2, 8, 240, { classId: "cls-9a", subjectId: "sub-cie", createdBy: "u-carlos", location: "Bosque da Ciência (INPA)" }),
    ev("evt-8", "Simulado geral", "prova", -8, 8, 210, { location: "Salas de aula" }),
    ev("evt-9", "Ponto facultativo", "feriado", 15, 0, 1440, { allDay: true }),
    ev("evt-10", "Prova de Matemática", "prova", 2, 14, 90, { classId: "cls-9b", subjectId: "sub-mat", createdBy: "u-carlos", location: "Sala 12" }),
    ev("evt-11", "Olimpíada de Matemática – treino", "aula", 8, 14, 90, { classId: "cls-9a", subjectId: "sub-mat", createdBy: "u-carlos", location: "Biblioteca" }),
    ev("evt-12", "Apresentação de seminários de Inglês", "trabalho", 13, 10, 90, { classId: "cls-9a", subjectId: "sub-ing", createdBy: "u-fernanda" }),
    ev("evt-13", "Conselho de classe", "evento", 18, 14, 180, { location: "Sala dos professores", description: "Somente professores e coordenação." }),
  ]

  // ---------------- Biblioteca ----------------
  const mat = (
    id: string,
    title: string,
    type: Material["type"],
    subjectId: string,
    uploadedBy: string,
    days: number,
    extra: Partial<Material>,
  ): Material => ({
    id,
    title,
    type,
    subjectId,
    uploadedBy,
    description: "",
    classId: null,
    file: null,
    url: null,
    downloadable: true,
    createdAt: iso(at(days)),
    pages: null,
    ...extra,
  })
  const pdf = (name: string, size: number) => ({ name, size, mime: "application/pdf", url: `/materiais/${name}` })
  const materials: Material[] = [
    mat("mat-1", "Biologia – Volume 1", "livro", "sub-cie", "u-carlos", -3, { description: "Capítulos 1 a 4: células, tecidos e organização dos seres vivos.", file: pdf("biologia-volume-1.pdf", 4200), pages: 4 }),
    mat("mat-2", "Equações do 1º grau – resumo", "pdf", "sub-mat", "u-carlos", -12, { description: "Resumo com exemplos resolvidos e exercícios de fixação.", file: pdf("equacoes-1-grau.pdf", 3100), pages: 3, classId: "cls-9a" }),
    mat("mat-3", "Teorema de Pitágoras – slides da aula", "apresentacao", "sub-mat", "u-carlos", -1, { description: "Slides usados em sala, com aplicações no cotidiano.", file: pdf("teorema-de-pitagoras.pdf", 2800), pages: 3 }),
    mat("mat-4", "Guia de redação escolar", "pdf", "sub-por", "u-juliana", -20, { description: "Estrutura do texto dissertativo-argumentativo e critérios de correção.", file: pdf("guia-de-redacao.pdf", 3300), pages: 3 }),
    mat("mat-5", "Revolução Industrial – texto-base", "pdf", "sub-his", "u-roberto", -6, { description: "Texto de apoio para o trabalho em dupla.", file: pdf("revolucao-industrial.pdf", 3000), pages: 3 }),
    mat("mat-6", "Biomas brasileiros – atlas ilustrado", "livro", "sub-geo", "u-roberto", -28, { description: "Atlas com mapas e características de cada bioma.", file: pdf("biomas-brasileiros.pdf", 3600), pages: 3 }),
    mat("mat-7", "Sustentabilidade na escola – cartilha", "pdf", "sub-cie", "u-patricia", -9, { description: "Ações simples de economia de água, energia e reciclagem.", file: pdf("cartilha-sustentabilidade.pdf", 2900), pages: 3 }),
    mat("mat-8", "Present perfect – grammar guide", "pdf", "sub-ing", "u-fernanda", -4, { description: "Explicação e exemplos do present perfect.", file: pdf("present-perfect.pdf", 2600), pages: 2 }),
    mat("mat-9", "Khan Academy – Matemática", "link", "sub-mat", "u-carlos", -40, { description: "Exercícios gratuitos e vídeos para revisar no seu ritmo.", url: "https://pt.khanacademy.org/math", downloadable: false }),
    mat("mat-10", "IBGE Educa – Jovens", "link", "sub-geo", "u-roberto", -35, { description: "Dados e curiosidades do Brasil para pesquisas escolares.", url: "https://educa.ibge.gov.br/jovens", downloadable: false }),
    mat("mat-11", "Prova anterior de Matemática (gabarito)", "pdf", "sub-mat", "u-carlos", -2, { description: "Material restrito à turma 9º Ano B.", file: pdf("equacoes-1-grau.pdf", 3100), classId: "cls-9b", downloadable: true }),
  ]

  // ---------------- Comunicação ----------------
  const conversations: Conversation[] = [
    { id: "cnv-1", participantIds: ["u-maria", "u-carlos"], subjectId: "sub-mat", updatedAt: iso(at(0, 8, 12)) },
    { id: "cnv-2", participantIds: ["u-maria", "u-juliana"], subjectId: "sub-por", updatedAt: iso(at(-1, 16, 40)) },
    { id: "cnv-3", participantIds: ["u-st-2", "u-carlos"], subjectId: "sub-mat", updatedAt: iso(at(0, 7, 30)) },
    { id: "cnv-4", participantIds: ["u-st-3", "u-carlos"], subjectId: "sub-cie", updatedAt: iso(at(-1, 20, 5)) },
    { id: "cnv-5", participantIds: ["u-maria", "u-roberto"], subjectId: "sub-his", updatedAt: iso(at(-4, 11, 0)) },
  ]
  const msg = (id: string, conversationId: string, senderId: string, body: string, d: Date, read: boolean): Message => ({
    id,
    conversationId,
    senderId,
    body,
    createdAt: iso(d),
    readAt: read ? iso(d) : null,
  })
  const messages: Message[] = [
    msg("msg-1", "cnv-1", "u-maria", "Professor, na questão 7 da lista de Pitágoras a hipotenusa é o lado de 13 cm?", at(-1, 19, 2), true),
    msg("msg-2", "cnv-1", "u-carlos", "Isso mesmo, Maria! A hipotenusa é sempre o lado oposto ao ângulo reto.", at(0, 8, 5), false),
    msg("msg-3", "cnv-1", "u-carlos", "Amanhã revisamos na aula antes da prova. Bons estudos!", at(0, 8, 12), false),
    msg("msg-4", "cnv-2", "u-juliana", "Maria, sua redação ficou ótima. Que tal inscrevê-la no concurso da escola?", at(-1, 16, 20), true),
    msg("msg-5", "cnv-2", "u-maria", "Que legal, professora! Vou pensar e te respondo amanhã.", at(-1, 16, 40), true),
    msg("msg-6", "cnv-3", "u-st-2", "Professor, posso entregar a lista de funções amanhã? Fiquei doente.", at(0, 7, 30), false),
    msg("msg-7", "cnv-4", "u-st-3", "Qual é o prazo do relatório do Bosque da Ciência?", at(-1, 20, 5), false),
    msg("msg-8", "cnv-5", "u-roberto", "Lembrem de usar pelo menos duas referências no trabalho.", at(-4, 11, 0), true),
  ]

  const announcements: Announcement[] = [
    { id: "ann-1", title: "Reunião de pais e responsáveis", body: "Convidamos as famílias para a entrega dos boletins no auditório, às 18h. A presença é muito importante.", authorId: "u-patricia", audience: "todos", classId: null, priority: "importante", createdAt: iso(at(-1, 10)) },
    { id: "ann-2", title: "Semana da Sustentabilidade", body: "Participe do Desafio Sustentável e traga recicláveis para a Feira de Ciências.", authorId: "u-patricia", audience: "alunos", classId: null, priority: "normal", createdAt: iso(at(-3, 9)) },
    { id: "ann-3", title: "Revisão para a prova de Matemática", body: "Haverá revisão nos primeiros 20 minutos da aula de amanhã. Tragam suas dúvidas!", authorId: "u-carlos", audience: "alunos", classId: "cls-9a", priority: "normal", createdAt: iso(at(0, 7, 50)) },
    { id: "ann-4", title: "Prazo de lançamento de notas", body: "As notas do bimestre devem ser lançadas no sistema até sexta-feira.", authorId: "u-patricia", audience: "professores", classId: null, priority: "importante", createdAt: iso(at(-2, 14)) },
  ]

  const notif = (id: string, userId: string, kind: Notification["kind"], title: string, body: string, href: string, days: number, read: boolean): Notification => ({
    id,
    userId,
    kind,
    title,
    body,
    href,
    read,
    createdAt: iso(at(days, 8)),
  })
  const notifications: Notification[] = [
    notif("ntf-1", "u-maria", "nota", "Nova nota lançada", "Sua atividade \"Funções do 1º grau – gráficos\" foi corrigida.", "/aluno/notas", 0, false),
    notif("ntf-2", "u-maria", "tarefa", "Prazo se aproximando", "\"Lista: teorema de Pitágoras\" vence em 2 dias.", "/aluno/tarefas", 0, false),
    notif("ntf-3", "u-maria", "desafio", "Novo desafio disponível", "Quiz de Matemática: equações do 1º grau.", "/aluno/desafios", -1, false),
    notif("ntf-4", "u-maria", "aviso", "Aviso da coordenação", "Reunião de pais e responsáveis.", "/aluno/comunicacao?aba=avisos", -1, true),
    notif("ntf-5", "u-carlos", "tarefa", "Novas entregas", "Há entregas aguardando correção em \"Funções do 1º grau – gráficos\".", "/professor/atividades", 0, false),
    notif("ntf-6", "u-carlos", "aviso", "Prazo de lançamento de notas", "As notas devem ser lançadas até sexta-feira.", "/professor/comunicacao?aba=avisos", -2, false),
    notif("ntf-7", "u-patricia", "aviso", "Calendário atualizado", "Feira de Ciências confirmada na quadra coberta.", "/admin/calendario", -1, false),
  ]

  // ---------------- Desafios ----------------
  const challenges: Challenge[] = [
    {
      id: "chl-sust",
      title: "Desafio Sustentável",
      description: "Pequenas ações, grande impacto! Complete as etapas durante a Semana da Sustentabilidade.",
      category: "sustentabilidade",
      kind: "checklist",
      points: 100,
      startsAt: iso(at(-5)),
      endsAt: iso(at(10, 23, 59)),
      featured: true,
      steps: [
        "Separe o lixo reciclável da sua casa por 3 dias",
        "Calcule quantos litros de água sua família usa no banho",
        "Desligue aparelhos da tomada ao sair dos cômodos durante uma semana",
        "Plante uma muda ou cuide de uma planta",
        "Escreva 3 ideias para deixar a escola mais sustentável",
      ],
      createdBy: "u-patricia",
    },
    {
      id: "chl-quiz-mat",
      title: "Quiz de Matemática: equações do 1º grau",
      description: "Teste seus conhecimentos. Você pode refazer quantas vezes quiser — o que vale é aprender!",
      category: "quiz",
      kind: "quiz",
      points: 50,
      startsAt: iso(at(-1)),
      endsAt: iso(at(14, 23, 59)),
      classId: "cls-9a",
      subjectId: "sub-mat",
      questions: [
        { prompt: "Qual é o valor de x em 2x + 6 = 14?", options: ["x = 3", "x = 4", "x = 5", "x = 10"], answer: 1, explanation: "2x = 14 − 6 = 8, logo x = 4." },
        { prompt: "Resolva: 3x − 9 = 0", options: ["x = −3", "x = 0", "x = 3", "x = 9"], answer: 2, explanation: "3x = 9, logo x = 3." },
        { prompt: "O dobro de um número mais 5 é 25. Qual é o número?", options: ["10", "12", "15", "20"], answer: 0, explanation: "2n + 5 = 25 → 2n = 20 → n = 10." },
        { prompt: "Em x/4 = 7, quanto vale x?", options: ["11", "21", "28", "3"], answer: 2, explanation: "Multiplicando os dois lados por 4: x = 28." },
        { prompt: "Qual equação representa \"a metade de um número é 9\"?", options: ["2x = 9", "x/2 = 9", "x − 2 = 9", "x + 2 = 9"], answer: 1 },
      ],
      createdBy: "u-carlos",
    },
    {
      id: "chl-leitura",
      title: "Desafio de Leitura",
      description: "Leia \"O Pequeno Príncipe\" no seu ritmo e registre cada etapa da leitura.",
      category: "leitura",
      kind: "checklist",
      points: 80,
      startsAt: iso(at(-10)),
      endsAt: iso(at(20, 23, 59)),
      subjectId: "sub-por",
      steps: ["Capítulos 1 a 9", "Capítulos 10 a 18", "Capítulos 19 a 27", "Escreva uma frase que marcou você"],
      createdBy: "u-juliana",
    },
    {
      id: "chl-ciencias",
      title: "Cientista em casa: ciclo da água",
      description: "Monte um mini ciclo da água com materiais simples e registre suas observações.",
      category: "ciencias",
      kind: "checklist",
      points: 60,
      startsAt: iso(at(-2)),
      endsAt: iso(at(12, 23, 59)),
      classId: "cls-9a",
      subjectId: "sub-cie",
      steps: ["Reúna os materiais (pote, filme plástico, água, gelo)", "Monte o experimento", "Observe por 2 horas e anote", "Explique o que aconteceu com suas palavras"],
      createdBy: "u-carlos",
    },
    {
      id: "chl-meta",
      title: "Meta semanal de aprendizagem",
      description: "Estude 30 minutos por dia, no seu ritmo. Cada dia conta!",
      category: "meta",
      kind: "checklist",
      points: 40,
      startsAt: iso(at(-now.getDay())),
      endsAt: iso(at(6 - now.getDay(), 23, 59)),
      steps: ["Segunda-feira", "Terça-feira", "Quarta-feira", "Quinta-feira", "Sexta-feira"],
      createdBy: "u-patricia",
    },
    {
      id: "chl-geo-old",
      title: "Quiz de Geografia: capitais do Norte",
      description: "Quiz encerrado sobre as capitais da Região Norte.",
      category: "quiz",
      kind: "quiz",
      points: 50,
      startsAt: iso(at(-40)),
      endsAt: iso(at(-25)),
      subjectId: "sub-geo",
      questions: [
        { prompt: "Qual é a capital do Amazonas?", options: ["Belém", "Manaus", "Porto Velho", "Boa Vista"], answer: 1 },
        { prompt: "Qual é a capital de Roraima?", options: ["Boa Vista", "Macapá", "Palmas", "Rio Branco"], answer: 0 },
      ],
      createdBy: "u-roberto",
    },
    {
      id: "chl-leitura-old",
      title: "Maratona de leitura de contos",
      description: "Desafio encerrado: leitura de três contos brasileiros.",
      category: "leitura",
      kind: "checklist",
      points: 120,
      startsAt: iso(at(-60)),
      endsAt: iso(at(-30)),
      steps: ["Conto 1", "Conto 2", "Conto 3"],
      createdBy: "u-juliana",
    },
  ]

  const participations: ChallengeParticipation[] = [
    { id: "par-1", challengeId: "chl-sust", studentId: "u-maria", status: "em_andamento", completedSteps: [0, 1], attempts: 0, pointsAwarded: 0, startedAt: iso(at(-4)) },
    { id: "par-2", challengeId: "chl-leitura", studentId: "u-maria", status: "em_andamento", completedSteps: [0], attempts: 0, pointsAwarded: 0, startedAt: iso(at(-8)) },
    { id: "par-3", challengeId: "chl-geo-old", studentId: "u-maria", status: "concluido", completedSteps: [], bestScore: 1, attempts: 1, pointsAwarded: 50, startedAt: iso(at(-35)), completedAt: iso(at(-35)) },
    { id: "par-4", challengeId: "chl-leitura-old", studentId: "u-maria", status: "concluido", completedSteps: [0, 1, 2], attempts: 0, pointsAwarded: 120, startedAt: iso(at(-55)), completedAt: iso(at(-33)) },
  ]
  // Participações dos colegas (somente agregadas na interface).
  students
    .filter((s) => s.id !== "u-maria")
    .forEach((s, i) => {
      if (i % 2 === 0)
        participations.push({ id: `par-x-${i}`, challengeId: "chl-sust", studentId: s.id, status: i % 4 === 0 ? "concluido" : "em_andamento", completedSteps: i % 4 === 0 ? [0, 1, 2, 3, 4] : [0], attempts: 0, pointsAwarded: i % 4 === 0 ? 100 : 0, startedAt: iso(at(-3)), completedAt: i % 4 === 0 ? iso(at(-1)) : null })
      if (i % 3 === 0)
        participations.push({ id: `par-y-${i}`, challengeId: "chl-leitura-old", studentId: s.id, status: "concluido", completedSteps: [0, 1, 2], attempts: 0, pointsAwarded: 120, startedAt: iso(at(-50)), completedAt: iso(at(-31)) })
    })

  const points: PointEntry[] = [
    { id: "pts-1", studentId: "u-maria", points: 120, reason: "Desafio concluído: Maratona de leitura de contos", challengeId: "chl-leitura-old", createdAt: iso(at(-33)) },
    { id: "pts-2", studentId: "u-maria", points: 50, reason: "Desafio concluído: Quiz de Geografia", challengeId: "chl-geo-old", createdAt: iso(at(-35)) },
    { id: "pts-3", studentId: "u-maria", points: 60, reason: "Entregas em dia no mês", challengeId: null, createdAt: iso(at(-30)) },
    { id: "pts-4", studentId: "u-maria", points: 50, reason: "Participação na Feira do Livro", challengeId: null, createdAt: iso(at(-18)) },
    { id: "pts-5", studentId: "u-maria", points: 40, reason: "Meta semanal cumprida", challengeId: null, createdAt: iso(at(-9)) },
  ]
  participations
    .filter((p) => p.studentId !== "u-maria" && p.pointsAwarded > 0)
    .forEach((p) => points.push({ id: `pts-${p.id}`, studentId: p.studentId, points: p.pointsAwarded, reason: "Desafio concluído", challengeId: p.challengeId, createdAt: p.completedAt ?? created }))

  const settings: SchoolSettings = {
    schoolYear: year,
    currentTerm: term,
    passingGrade: 6,
    allowStudentToStudentMessages: false,
    showClassCollectiveGoal: true,
    classGoalPoints: 3000,
    maxUploadMb: 2,
  }

  return {
    version: DEMO_DB_VERSION,
    seededAt: iso(now),
    schools: [school],
    users,
    credentials,
    classes,
    enrollments,
    subjects,
    assignments,
    activities,
    submissions,
    grades,
    events,
    materials,
    conversations,
    messages,
    announcements,
    notifications,
    challenges,
    participations,
    points,
    settings,
  }
}
