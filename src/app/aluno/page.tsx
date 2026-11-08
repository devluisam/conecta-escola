"use client"

import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Globe2,
  Megaphone,
  MessageCircle,
  Star,
  Trophy,
  UserRound,
} from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { useUser } from "@/components/auth/auth-provider"
import { SubjectAverageChart } from "@/components/charts/performance-charts"
import { TaskStatusBadge } from "@/components/shared/badges"
import { EventIcon, Panel } from "@/components/shared/panel"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState, PageSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { averageBySubject, overallAverage } from "@/lib/academic"
import { dueLabel, firstName, fmtDateTime, fmtRelative, fmtScore, welcomeBack } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

const quickLinks = [
  { href: "/aluno/agenda", label: "Agenda", Icon: CalendarDays, cls: "text-navy" },
  { href: "/aluno/tarefas", label: "Tarefas", Icon: ClipboardCheck, cls: "text-navy" },
  { href: "/aluno/biblioteca", label: "Biblioteca", Icon: BookOpen, cls: "text-navy" },
  { href: "/aluno/desafios", label: "Desafios", Icon: Trophy, cls: "text-reward" },
  { href: "/aluno/comunicacao", label: "Comunicação", Icon: MessageCircle, cls: "text-violet" },
  { href: "/aluno/perfil", label: "Perfil", Icon: UserRound, cls: "text-navy" },
]

export default function StudentHome() {
  const user = useUser()
  const range = useMemo(() => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: new Date(from.getTime() + 21 * 86400000).toISOString() }
  }, [])
  const activities = useRepoQuery(["activities"], (r) => r.listActivities())
  const challenges = useRepoQuery(["challenges"], (r) => r.listChallenges())
  const points = useRepoQuery(["points"], (r) => r.getPointsSummary())
  const events = useRepoQuery(["events", range], (r) => r.listEvents(range))
  const announcements = useRepoQuery(["announcements"], (r) => r.listAnnouncements())
  const materials = useRepoQuery(["materials"], (r) => r.listMaterials())
  const grades = useRepoQuery(["grades"], (r) => r.listGrades())
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())

  if (activities.isLoading || challenges.isLoading || points.isLoading) return <PageSkeleton />

  const acts = activities.data ?? []
  const pending = acts.filter((a) => a.studentStatus === "pendente" || a.studentStatus === "atrasada")
  const done = acts.filter((a) => a.studentStatus === "entregue" || a.studentStatus === "corrigida")
  const inProgress = (challenges.data ?? []).filter((c) => c.participation?.status === "em_andamento" && c.isOpen)
  const featured = (challenges.data ?? []).find((c) => c.featured && c.isOpen) ?? (challenges.data ?? []).find((c) => c.isOpen)
  const recentActivity = [...acts]
    .sort((a, b) => (b.mySubmission?.gradedAt ?? b.mySubmission?.submittedAt ?? b.createdAt).localeCompare(a.mySubmission?.gradedAt ?? a.mySubmission?.submittedAt ?? a.createdAt))
    .slice(0, 4)
  const subjectAvg = averageBySubject(grades.data ?? [])
  const overall = overallAverage(grades.data ?? [])
  const upcoming = (events.data ?? []).filter((e) => new Date(e.endsAt) >= new Date()).slice(0, 4)
  const featuredMaterial = (materials.data ?? []).find((m) => m.type === "livro") ?? materials.data?.[0]
  const featuredProgress = featured?.participation
    ? Math.round((featured.participation.completedSteps.length / (featured.steps?.length || 1)) * 100)
    : 0

  return (
    <div className="space-y-6">
      {/* Saudação */}
      <section className="relative overflow-hidden rounded-2xl bg-brand px-5 py-5 text-white sm:bg-transparent sm:p-0 sm:text-navy">
        <div className="relative z-10">
          <h1 className="text-2xl font-bold tracking-tight sm:text-[26px]">
            Olá, {firstName(user.name)}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-[15px] text-white/85 sm:text-muted-foreground">
            {welcomeBack(user.pronoun)}
            {ctx.data?.schoolClass && <span className="hidden sm:inline"> · {ctx.data.schoolClass.name} – {ctx.data.school.name}</span>}
          </p>
        </div>
        <svg viewBox="0 0 120 120" className="absolute -top-4 -right-4 size-32 opacity-25 sm:hidden" aria-hidden>
          <circle cx="60" cy="60" r="50" fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="1 7" strokeLinecap="round" />
          <path d="M60 70 C50 63 38 61 26 63 V95 C38 93 50 95 60 102 Z M60 70 C70 63 82 61 94 63 V95 C82 93 70 95 60 102 Z" fill="#fff" />
          <circle cx="60" cy="40" r="7" fill="#F5B942" />
        </svg>
      </section>

      {/* Acesso rápido (celular) */}
      <nav aria-label="Acesso rápido" className="grid grid-cols-3 gap-3 lg:hidden">
        {quickLinks.map(({ href, label, Icon, cls }) => (
          <Link key={href} href={href} className="flex flex-col items-center gap-2 rounded-xl bg-card py-4 text-xs font-medium text-navy ring-1 ring-foreground/[0.06] transition-colors active:bg-muted">
            <Icon className={cn("size-7", cls)} aria-hidden />
            {label}
          </Link>
        ))}
      </nav>

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Tarefas pendentes" value={pending.length} icon={ClipboardCheck} tone="brand" href="/aluno/tarefas?status=pendentes" hint={pending.some((a) => a.studentStatus === "atrasada") ? "Inclui atividade atrasada" : "Fique de olho nos prazos"} />
        <StatCard label="Atividades concluídas" value={done.length} icon={CheckCircle2} tone="success" href="/aluno/tarefas?status=concluidas" hint="Entregues e corrigidas" />
        <StatCard label="Desafios em andamento" value={inProgress.length} icon={Trophy} tone="violet" href="/aluno/desafios" hint="Continue de onde parou" />
        <StatCard label="Pontos" value={points.data?.total ?? 0} icon={Star} tone="reward" href="/aluno/desafios#pontos" hint="Por participação e constância" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Próximos compromissos */}
        <Panel title="Próximos compromissos" action={{ label: "Ver agenda completa", href: "/aluno/agenda" }}>
          {events.isLoading ? (
            <p className="text-sm text-muted-foreground">Carregando…</p>
          ) : upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Agenda livre" description="Nenhum compromisso nas próximas semanas." className="py-6" />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((e) => (
                <li key={e.id}>
                  <Link href={e.href ?? "/aluno/agenda"} className="flex items-center gap-3 rounded-lg p-1 transition-colors hover:bg-muted">
                    <EventIcon type={e.type} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">{e.title}</span>
                      <span className="block text-xs text-muted-foreground">{e.allDay ? "Dia todo" : fmtDateTime(e.startsAt)}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/* Desempenho */}
        <Panel
          title={
            <span className="flex items-baseline gap-2">
              Desempenho acadêmico
              {overall != null && <span className="text-xs font-medium text-muted-foreground">média geral {fmtScore(overall)}</span>}
            </span>
          }
          action={{ label: "Ver boletim", href: "/aluno/notas" }}
          className="lg:col-span-2"
        >
          {subjectAvg.length ? (
            <SubjectAverageChart data={subjectAvg} passing={ctx.data?.settings.passingGrade ?? 6} height={230} />
          ) : (
            <EmptyState title="Sem notas ainda" description="Suas notas aparecerão aqui assim que forem lançadas." className="py-6" />
          )}
        </Panel>

        {/* Últimas atividades */}
        <Panel title="Últimas atividades" action={{ label: "Ver tarefas", href: "/aluno/tarefas" }}>
          <ul className="divide-y">
            {recentActivity.map((a) => (
              <li key={a.id}>
                <Link href={`/aluno/tarefas/${a.id}`} className="flex items-start justify-between gap-3 py-2.5 transition-colors hover:bg-muted/50">
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-navy">{a.title}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {a.subject.name} ·{" "}
                      {a.studentStatus === "corrigida"
                        ? `Nota ${fmtScore(a.mySubmission?.score)} / ${a.maxScore}`
                        : a.studentStatus === "entregue"
                          ? "Aguardando correção"
                          : dueLabel(a.dueAt)}
                    </span>
                  </span>
                  {a.studentStatus && <TaskStatusBadge status={a.studentStatus} className="shrink-0" />}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        {/* Avisos */}
        <Panel title="Avisos escolares" action={{ label: "Ver todos", href: "/aluno/comunicacao?aba=avisos" }}>
          {(announcements.data ?? []).length === 0 ? (
            <EmptyState icon={Megaphone} title="Sem avisos" className="py-6" />
          ) : (
            <ul className="space-y-3">
              {(announcements.data ?? []).slice(0, 3).map((a) => (
                <li key={a.id} className={cn("rounded-lg border-l-[3px] bg-surface px-3 py-2.5", a.priority === "importante" ? "border-reward" : "border-brand")}>
                  <p className="text-sm font-semibold text-navy">{a.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{a.body}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {a.author.name} · {fmtRelative(a.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <div className="flex min-w-0 flex-col gap-4">
          {/* Biblioteca */}
          <Panel title="Biblioteca digital" action={{ label: "Ver todos", href: "/aluno/biblioteca" }}>
            {featuredMaterial ? (
              <div className="flex gap-4">
                <div
                  className="grid h-24 w-[72px] shrink-0 place-items-center rounded-md p-2 text-center text-[10px] leading-tight font-bold text-white uppercase shadow-md"
                  style={{ background: `linear-gradient(160deg, ${featuredMaterial.subject.color}, #071D3A)` }}
                  aria-hidden
                >
                  {featuredMaterial.title.split("–")[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy">{featuredMaterial.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{featuredMaterial.description}</p>
                  <Button asChild variant="outline" size="sm" className="mt-2 border-brand/40 text-brand hover:text-brand">
                    <Link href={`/aluno/biblioteca?abrir=${featuredMaterial.id}`}>Acessar</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <EmptyState icon={BookOpen} title="Nenhum material" className="py-6" />
            )}
          </Panel>

          {/* Destaque */}
          {featured && (
            <Panel title="Destaque da semana">
              <Link href={`/aluno/desafios/${featured.id}`} className="group flex items-center gap-3 rounded-xl bg-violet-50 p-3.5 transition-colors hover:bg-[#EAE2FB]">
                <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-white text-violet">
                  <Globe2 className="size-6" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold text-navy">{featured.title}</span>
                  <span className="block text-xs text-muted-foreground">
                    {featured.participation ? `Seu progresso: ${featuredProgress}%` : `Participe e ganhe ${featured.points} pontos!`}
                  </span>
                  {featured.participation && <Progress value={featuredProgress} className="mt-2 h-1.5" aria-label="Progresso no desafio" />}
                </span>
                <ArrowRight className="size-5 text-violet transition-transform group-hover:translate-x-0.5" aria-hidden />
              </Link>
            </Panel>
          )}
        </div>
      </div>
    </div>
  )
}
