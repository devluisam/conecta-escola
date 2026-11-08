"use client"

import { BookOpenCheck, CalendarDays, ClipboardList, Clock, Megaphone, MessageCircle, Plus, Upload, Users } from "lucide-react"
import Link from "next/link"
import { useMemo } from "react"
import { useUser } from "@/components/auth/auth-provider"
import { UserAvatar } from "@/components/shared/badges"
import { EventIcon, Panel } from "@/components/shared/panel"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState, PageSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { fmtChatTime, fmtDateTime, fmtDay, fmtTime, firstName, welcomeBack } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"

const actions = [
  { href: "/professor/atividades", label: "Nova atividade", Icon: Plus },
  { href: "/professor/materiais", label: "Publicar material", Icon: Upload },
  { href: "/professor/notas", label: "Lançar notas", Icon: BookOpenCheck },
  { href: "/professor/comunicacao?aba=avisos", label: "Enviar comunicado", Icon: Megaphone },
]

export default function TeacherHome() {
  const user = useUser()
  const range = useMemo(() => {
    const from = new Date()
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: new Date(from.getTime() + 14 * 86400000).toISOString() }
  }, [])
  const classes = useRepoQuery(["my-classes"], (r) => r.listMyClasses())
  const activities = useRepoQuery(["activities"], (r) => r.listActivities())
  const conversations = useRepoQuery(["conversations"], (r) => r.listConversations())
  const events = useRepoQuery(["events", range], (r) => r.listEvents(range))

  if (classes.isLoading || activities.isLoading) return <PageSkeleton />

  const students = (classes.data ?? []).reduce((s, c) => s + c.students, 0)
  const acts = activities.data ?? []
  const toGrade = acts.filter((a) => (a.stats?.toGrade ?? 0) > 0)
  const toGradeCount = toGrade.reduce((s, a) => s + (a.stats?.toGrade ?? 0), 0)
  const unread = (conversations.data ?? []).reduce((s, c) => s + c.unread, 0)
  const upcoming = (events.data ?? []).filter((e) => new Date(e.endsAt) >= new Date()).slice(0, 5)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-[26px]">
            Olá, {firstName(user.name)}! <span aria-hidden>👋</span>
          </h1>
          <p className="mt-1 text-[15px] text-muted-foreground">
            {welcomeBack(user.pronoun)} {toGradeCount > 0 ? `Você tem ${toGradeCount} entregas aguardando correção.` : "Tudo em dia por aqui."}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        <StatCard label="Turmas vinculadas" value={classes.data?.length ?? 0} icon={Users} tone="brand" href="/professor/turmas" hint={`${students} alunos no total`} />
        <StatCard label="Atividades cadastradas" value={acts.length} icon={ClipboardList} tone="violet" href="/professor/atividades" />
        <StatCard label="Entregas para corrigir" value={toGradeCount} icon={Clock} tone="reward" href="/professor/atividades" hint={`${toGrade.length} atividade(s)`} />
        <StatCard label="Mensagens não lidas" value={unread} icon={MessageCircle} tone="success" href="/professor/comunicacao" />
      </div>

      <nav aria-label="Ações rápidas" className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {actions.map(({ href, label, Icon }) => (
          <Link key={href} href={href} className="flex items-center gap-3 rounded-xl border border-dashed border-brand/30 bg-brand-50/50 p-3.5 text-sm font-semibold text-brand-600 transition-colors hover:bg-brand-50">
            <span className="grid size-9 place-items-center rounded-lg bg-white text-brand shadow-sm">
              <Icon className="size-[18px]" aria-hidden />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Entregas pendentes de correção" action={{ label: "Ver atividades", href: "/professor/atividades" }} className="lg:col-span-2">
          {toGrade.length === 0 ? (
            <EmptyState icon={BookOpenCheck} title="Nenhuma correção pendente" description="Todas as entregas foram corrigidas." className="py-6" />
          ) : (
            <ul className="divide-y">
              {toGrade.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-3 py-3">
                  <span className="h-10 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: a.subject.color }} aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-navy">{a.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {a.schoolClass.name} · {a.subject.name} · prazo {fmtDay(a.dueAt).toLowerCase()}
                    </p>
                  </div>
                  <span className="hidden rounded-full bg-reward-50 px-2.5 py-1 text-xs font-semibold text-reward-700 sm:inline">{a.stats?.toGrade} a corrigir</span>
                  <Button asChild size="sm">
                    <Link href={`/professor/atividades/${a.id}`}>Corrigir</Link>
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Agenda de aulas" action={{ label: "Ver agenda", href: "/professor/agenda" }}>
          {upcoming.length === 0 ? (
            <EmptyState icon={CalendarDays} title="Sem compromissos" className="py-6" />
          ) : (
            <ul className="space-y-3">
              {upcoming.map((e) => (
                <li key={e.id} className="flex items-center gap-3">
                  <EventIcon type={e.type} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-navy">{e.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {fmtDay(e.startsAt)} {e.allDay ? "" : `· ${fmtTime(e.startsAt)}`} {e.className && `· ${e.className}`}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Minhas turmas" action={{ label: "Ver turmas", href: "/professor/turmas" }} className="lg:col-span-2">
          <ul className="grid gap-3 sm:grid-cols-3">
            {(classes.data ?? []).map((c) => (
              <li key={c.id}>
                <Link href={`/professor/turmas/${c.id}`} className="block rounded-xl border p-4 transition-colors hover:border-brand/40 hover:bg-brand-50/40">
                  <p className="font-bold text-navy">{c.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.shift} · {c.room}
                  </p>
                  <p className="mt-3 flex items-center gap-1.5 text-sm text-navy">
                    <Users className="size-4 text-brand" aria-hidden /> {c.students} alunos
                  </p>
                  <p className="mt-1 truncate text-xs text-muted-foreground">{c.mySubjects.map((s) => s.name).join(", ")}</p>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel title="Mensagens recebidas" action={{ label: "Abrir", href: "/professor/comunicacao" }}>
          {(conversations.data ?? []).length === 0 ? (
            <EmptyState icon={MessageCircle} title="Nenhuma mensagem" className="py-6" />
          ) : (
            <ul className="space-y-1">
              {(conversations.data ?? []).slice(0, 4).map((c) => (
                <li key={c.id}>
                  <Link href={`/professor/comunicacao?c=${c.id}`} className="flex items-center gap-3 rounded-lg p-1.5 transition-colors hover:bg-muted">
                    <UserAvatar user={c.other} size="sm" />
                    <span className="min-w-0 flex-1">
                      <span className="flex justify-between gap-2">
                        <span className={c.unread ? "truncate text-sm font-bold text-navy" : "truncate text-sm font-semibold text-navy"}>{c.other.name}</span>
                        {c.lastMessage && <span className="shrink-0 text-[11px] text-muted-foreground" title={fmtDateTime(c.lastMessage.createdAt)}>{fmtChatTime(c.lastMessage.createdAt)}</span>}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">{c.lastMessage?.body}</span>
                    </span>
                    {c.unread > 0 && <span className="size-2.5 shrink-0 rounded-full bg-brand" aria-label="não lida" />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
