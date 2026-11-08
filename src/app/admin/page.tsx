"use client"

import { BookOpen, CalendarDays, ClipboardList, GraduationCap, Link2, Megaphone, MessageCircle, School, Trophy, UserPlus, Users } from "lucide-react"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { useUser } from "@/components/auth/auth-provider"
import { HorizontalBars } from "@/components/charts/performance-charts"
import { Panel } from "@/components/shared/panel"
import { StatCard } from "@/components/shared/stat-card"
import { ErrorState, PageSkeleton } from "@/components/shared/states"
import { firstName, fmtScore, welcomeBack } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"

const shortcuts = [
  { href: "/admin/usuarios", label: "Cadastrar usuário", Icon: UserPlus },
  { href: "/admin/turmas", label: "Criar turma", Icon: School },
  { href: "/admin/vinculos", label: "Vincular professor", Icon: Link2 },
  { href: "/admin/calendario", label: "Calendário escolar", Icon: CalendarDays },
  { href: "/admin/avisos", label: "Publicar aviso", Icon: Megaphone },
  { href: "/admin/disciplinas", label: "Disciplinas", Icon: BookOpen },
]

export default function AdminHome() {
  const user = useUser()
  const { data: s, isLoading, error, refetch } = useRepoQuery(["admin-stats"], (r) => r.getAdminStats())
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())
  if (isLoading) return <PageSkeleton />
  if (error || !s) return <ErrorState error={error} onRetry={refetch} />

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-[26px]">Olá, {firstName(user.name)}!</h1>
        <p className="mt-1 text-[15px] text-muted-foreground">
          {welcomeBack(user.pronoun)} Indicadores gerais de {ctx.data?.school.name ?? "sua escola"} · ano letivo {ctx.data?.settings.schoolYear}.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Alunos ativos" value={s.students} icon={GraduationCap} tone="brand" href="/admin/usuarios" />
        <StatCard label="Professores" value={s.teachers} icon={Users} tone="success" href="/admin/usuarios" />
        <StatCard label="Turmas" value={s.classes} icon={School} tone="violet" href="/admin/turmas" hint={`${s.subjects} disciplinas`} />
        <StatCard label="Taxa de entrega" value={`${s.submissionRate}%`} icon={ClipboardList} tone="reward" hint={`${s.activities} atividades cadastradas`} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Média por disciplina" className="lg:col-span-2">
          <figure>
            <figcaption className="sr-only">{s.bySubject.map((b) => `${b.subject}: ${fmtScore(b.average)}`).join("; ")}</figcaption>
            <div className="h-64" aria-hidden>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={s.bySubject} layout="vertical" margin={{ left: 24, right: 24 }}>
                  <CartesianGrid horizontal={false} stroke="#E1E7F0" />
                  <XAxis type="number" domain={[0, 10]} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#586A84" }} />
                  <YAxis type="category" dataKey="subject" width={110} tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "#0B1B33" }} />
                  <Tooltip cursor={{ fill: "#EAF4FF" }} formatter={(v) => [fmtScore(Number(v)), "Média"]} />
                  <Bar dataKey="average" radius={[0, 6, 6, 0]} maxBarSize={22} label={{ position: "right", fontSize: 11, fill: "#0B1B33", formatter: (v: unknown) => fmtScore(Number(v)) }}>
                    {s.bySubject.map((b) => (
                      <Cell key={b.subject} fill={b.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </figure>
        </Panel>
        <Panel title="Engajamento">
          <dl className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-surface p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <BookOpen className="size-3.5" aria-hidden /> Média geral
              </dt>
              <dd className="mt-1 text-2xl font-bold text-navy">{fmtScore(s.averageGrade)}</dd>
            </div>
            <div className="rounded-xl bg-surface p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Trophy className="size-3.5" aria-hidden /> Desafios ativos
              </dt>
              <dd className="mt-1 text-2xl font-bold text-navy">{s.activeChallenges}</dd>
            </div>
            <div className="col-span-2 rounded-xl bg-surface p-3">
              <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <MessageCircle className="size-3.5" aria-hidden /> Mensagens na última semana
              </dt>
              <dd className="mt-1 text-2xl font-bold text-navy">{s.messagesThisWeek}</dd>
            </div>
          </dl>
        </Panel>

        <Panel title="Entregas por turma">
          <HorizontalBars data={s.byClass.map((c) => ({ label: c.className, value: c.submissionRate }))} />
        </Panel>
        <Panel title="Média por turma">
          <HorizontalBars data={s.byClass.map((c) => ({ label: `${c.className} (${c.students})`, value: c.average, color: "#22A06B" }))} max={10} suffix="" />
        </Panel>
        <Panel title="Atalhos">
          <ul className="grid grid-cols-2 gap-2">
            {shortcuts.map(({ href, label, Icon }) => (
              <li key={href}>
                <Link href={href} className="flex h-full flex-col gap-2 rounded-xl border p-3 text-sm font-semibold text-navy transition-colors hover:border-brand/40 hover:bg-brand-50/50">
                  <Icon className="size-5 text-brand" aria-hidden />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </div>
  )
}
