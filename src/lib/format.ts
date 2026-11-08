import { format, formatDistanceToNowStrict, isToday, isTomorrow, isYesterday } from "date-fns"
import { ptBR } from "date-fns/locale"
import type { ActivityType, EventType, MaterialType, Role, StudentTaskStatus } from "@/lib/types"

export const fmtDate = (iso: string, pattern = "dd/MM/yyyy") => format(new Date(iso), pattern, { locale: ptBR })
export const fmtDateTime = (iso: string) => format(new Date(iso), "dd/MM/yyyy – HH:mm", { locale: ptBR })
export const fmtTime = (iso: string) => format(new Date(iso), "HH:mm", { locale: ptBR })
export const fmtLong = (iso: string) => format(new Date(iso), "EEEE, d 'de' MMMM", { locale: ptBR })

export function fmtRelative(iso: string) {
  const d = new Date(iso)
  return formatDistanceToNowStrict(d, { locale: ptBR, addSuffix: true })
}

export function fmtDay(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return "Hoje"
  if (isTomorrow(d)) return "Amanhã"
  if (isYesterday(d)) return "Ontem"
  return format(d, "dd/MM", { locale: ptBR })
}

export function fmtChatTime(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return format(d, "HH:mm")
  if (isYesterday(d)) return "Ontem"
  return format(d, "dd/MM")
}

/** "Vence hoje às 23:59", "Vence em 3 dias", "Venceu há 2 dias". */
export function dueLabel(iso: string) {
  const d = new Date(iso)
  if (isToday(d)) return `Vence hoje às ${fmtTime(iso)}`
  if (isTomorrow(d)) return `Vence amanhã às ${fmtTime(iso)}`
  const rel = formatDistanceToNowStrict(d, { locale: ptBR })
  return d.getTime() > Date.now() ? `Vence em ${rel}` : `Venceu há ${rel}`
}

export const fmtScore = (n: number | null | undefined) =>
  n == null ? "—" : n.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export const fmtBytes = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} MB`

export const initials = (name: string) =>
  name
    .split(" ")
    .filter((p) => p.length > 2 || p === p.toUpperCase())
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase()

export const firstName = (name: string) => name.split(" ")[0]

export const roleLabel: Record<Role, string> = { aluno: "Aluno(a)", professor: "Professor(a)", admin: "Administração" }

export const activityTypeLabel: Record<ActivityType, string> = {
  tarefa: "Tarefa",
  trabalho: "Trabalho",
  prova: "Prova",
  questionario: "Questionário",
}

export const eventTypeLabel: Record<EventType, string> = {
  prova: "Prova",
  trabalho: "Trabalho / entrega",
  aula: "Aula",
  evento: "Evento",
  feriado: "Feriado",
}

export const materialTypeLabel: Record<MaterialType, string> = {
  pdf: "PDF",
  video: "Vídeo",
  link: "Link",
  apresentacao: "Apresentação",
  livro: "Livro digital",
}

export const taskStatusLabel: Record<StudentTaskStatus, string> = {
  pendente: "Pendente",
  atrasada: "Atrasada",
  entregue: "Entregue",
  corrigida: "Corrigida",
}

/** Converte "yyyy-MM-ddTHH:mm" (input datetime-local) em ISO e vice-versa. */
export const toLocalInput = (iso: string) => format(new Date(iso), "yyyy-MM-dd'T'HH:mm")
export const fromLocalInput = (value: string) => new Date(value).toISOString()

export function welcomeBack(pronoun?: "ela" | "ele" | "neutro" | null) {
  if (pronoun === "ela") return "Bem-vinda de volta!"
  if (pronoun === "ele") return "Bem-vindo de volta!"
  return "Que bom ter você de volta!"
}
