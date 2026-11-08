import {
  BarChart3,
  BookOpen,
  BookOpenCheck,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FolderOpen,
  GraduationCap,
  Home,
  Layers,
  Link2,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  School,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react"
import type { Role } from "@/lib/types"

export interface NavItem {
  label: string
  href: string
  icon: LucideIcon
  /** Rótulo curto para a navegação inferior do celular. */
  short?: string
  badge?: "messages"
}

export const NAV: Record<Role, { items: NavItem[]; bottom: string[] }> = {
  aluno: {
    items: [
      { label: "Início", href: "/aluno", icon: Home },
      { label: "Minha Agenda", href: "/aluno/agenda", icon: CalendarDays, short: "Agenda" },
      { label: "Minhas Disciplinas", href: "/aluno/disciplinas", icon: Layers, short: "Disciplinas" },
      { label: "Tarefas", href: "/aluno/tarefas", icon: ClipboardCheck },
      { label: "Notas e Desempenho", href: "/aluno/notas", icon: BarChart3, short: "Notas" },
      { label: "Biblioteca Digital", href: "/aluno/biblioteca", icon: BookOpen, short: "Biblioteca" },
      { label: "Comunicação", href: "/aluno/comunicacao", icon: MessageCircle, badge: "messages" },
      { label: "Desafios", href: "/aluno/desafios", icon: Trophy },
      { label: "Meu Perfil", href: "/aluno/perfil", icon: UserRound, short: "Perfil" },
    ],
    bottom: ["/aluno", "/aluno/agenda", "/aluno/tarefas", "/aluno/comunicacao", "/aluno/perfil"],
  },
  professor: {
    items: [
      { label: "Início", href: "/professor", icon: Home },
      { label: "Minhas Turmas", href: "/professor/turmas", icon: Users, short: "Turmas" },
      { label: "Atividades", href: "/professor/atividades", icon: ClipboardList },
      { label: "Lançar Notas", href: "/professor/notas", icon: BookOpenCheck, short: "Notas" },
      { label: "Materiais", href: "/professor/materiais", icon: FolderOpen },
      { label: "Agenda de Aulas", href: "/professor/agenda", icon: CalendarDays, short: "Agenda" },
      { label: "Comunicação", href: "/professor/comunicacao", icon: MessageCircle, badge: "messages" },
      { label: "Desafios", href: "/professor/desafios", icon: Trophy },
      { label: "Meu Perfil", href: "/professor/perfil", icon: UserRound, short: "Perfil" },
    ],
    bottom: ["/professor", "/professor/turmas", "/professor/atividades", "/professor/comunicacao", "/professor/perfil"],
  },
  admin: {
    items: [
      { label: "Painel", href: "/admin", icon: LayoutDashboard },
      { label: "Usuários", href: "/admin/usuarios", icon: GraduationCap },
      { label: "Turmas", href: "/admin/turmas", icon: School },
      { label: "Disciplinas", href: "/admin/disciplinas", icon: Layers },
      { label: "Vínculos", href: "/admin/vinculos", icon: Link2 },
      { label: "Calendário Escolar", href: "/admin/calendario", icon: CalendarDays, short: "Calendário" },
      { label: "Avisos", href: "/admin/avisos", icon: Megaphone },
      { label: "Permissões", href: "/admin/permissoes", icon: ShieldCheck },
      { label: "Meu Perfil", href: "/admin/perfil", icon: UserRound, short: "Perfil" },
    ],
    bottom: ["/admin", "/admin/usuarios", "/admin/turmas", "/admin/avisos", "/admin/perfil"],
  },
}

export function isActive(pathname: string, href: string, role: Role) {
  if (href === `/${role}`) return pathname === href
  return pathname === href || pathname.startsWith(`${href}/`)
}
