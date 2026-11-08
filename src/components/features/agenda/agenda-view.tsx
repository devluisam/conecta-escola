"use client"

import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
} from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarPlus, ChevronLeft, ChevronRight, Clock, ExternalLink, MapPin, Pencil, Trash2, Users } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { ConfirmAction } from "@/components/shared/confirm-button"
import { PageHeader } from "@/components/shared/page-header"
import { EventIcon, eventDotColor } from "@/components/shared/panel"
import { EmptyState, ErrorState } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import type { EventView } from "@/lib/data/repository"
import { eventTypeLabel, fmtTime } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { EventType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { EventFormDialog } from "./event-form"

const TYPES: EventType[] = ["prova", "trabalho", "aula", "evento", "feriado"]
const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"]

export function AgendaView({ title, description, canCreate = false }: { title: string; description: string; canCreate?: boolean }) {
  const [view, setView] = useState<"mes" | "semana">("mes")
  const [cursor, setCursor] = useState(() => new Date())
  const [subject, setSubject] = useState("all")
  const [hidden, setHidden] = useState<EventType[]>([])
  const [selected, setSelected] = useState<EventView | null>(null)
  const [editing, setEditing] = useState<EventView | null | "new">(null)
  const [newDate, setNewDate] = useState<Date | null>(null)

  const days = useMemo(() => {
    const start = view === "mes" ? startOfWeek(startOfMonth(cursor)) : startOfWeek(cursor)
    const end = view === "mes" ? endOfWeek(endOfMonth(cursor)) : endOfWeek(cursor)
    return eachDayOfInterval({ start, end })
  }, [cursor, view])
  const range = useMemo(
    () => ({ from: days[0].toISOString(), to: addDays(days[days.length - 1], 1).toISOString() }),
    [days],
  )
  const { data, isLoading, error, refetch } = useRepoQuery(["events", range], (r) => r.listEvents(range))
  const remove = useRepoMutation((r, id: string) => r.deleteEvent(id), { success: "Compromisso removido.", onSuccess: () => setSelected(null) })

  const subjects = useMemo(() => [...new Map((data ?? []).filter((e) => e.subject).map((e) => [e.subject!.id, e.subject!])).values()], [data])
  const events = (data ?? []).filter((e) => !hidden.includes(e.type) && (subject === "all" || e.subjectId === subject))
  const eventsOn = (day: Date) => events.filter((e) => isSameDay(new Date(e.startsAt), day) || (new Date(e.startsAt) < day && new Date(e.endsAt) > day))

  const move = (dir: 1 | -1) => setCursor((c) => (view === "mes" ? addMonths(c, dir) : addWeeks(c, dir)))
  const label =
    view === "mes"
      ? format(cursor, "MMMM 'de' yyyy", { locale: ptBR })
      : `${format(days[0], "d MMM", { locale: ptBR })} – ${format(days[6], "d MMM yyyy", { locale: ptBR })}`

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          canCreate && (
            <Button
              onClick={() => {
                setNewDate(null)
                setEditing("new")
              }}
            >
              <CalendarPlus /> Novo compromisso
            </Button>
          )
        }
      />

      <div className="rounded-xl bg-card ring-1 ring-foreground/[0.06]">
        <div className="flex flex-col gap-3 border-b p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => move(-1)} aria-label={view === "mes" ? "Mês anterior" : "Semana anterior"}>
              <ChevronLeft />
            </Button>
            <Button variant="outline" size="icon" onClick={() => move(1)} aria-label={view === "mes" ? "Próximo mês" : "Próxima semana"}>
              <ChevronRight />
            </Button>
            <h2 className="ml-1 text-lg font-bold text-navy capitalize" aria-live="polite">
              {label}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => setCursor(new Date())} className="ml-1">
              Hoje
            </Button>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={subject} onValueChange={setSubject}>
              <SelectTrigger className="w-48" aria-label="Filtrar por disciplina">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as disciplinas</SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="inline-flex rounded-lg bg-muted p-1" role="group" aria-label="Visualização">
              {(["mes", "semana"] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={view === v}
                  className={cn("rounded-md px-3 py-1.5 text-sm font-medium transition-colors", view === v ? "bg-white text-navy shadow-sm" : "text-muted-foreground hover:text-navy")}
                >
                  {v === "mes" ? "Mês" : "Semana"}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 border-b px-4 py-2.5" role="group" aria-label="Tipos de compromisso">
          {TYPES.map((t) => {
            const on = !hidden.includes(t)
            return (
              <button
                key={t}
                aria-pressed={on}
                onClick={() => setHidden((h) => (on ? [...h, t] : h.filter((x) => x !== t)))}
                className={cn("inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors", on ? "bg-white text-navy" : "bg-muted text-muted-foreground line-through")}
              >
                <span className="size-2 rounded-full" style={{ backgroundColor: eventDotColor[t] }} aria-hidden />
                {eventTypeLabel[t]}
              </button>
            )
          })}
        </div>

        {error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : view === "mes" ? (
          <div className="p-2 sm:p-3">
            <div className="grid grid-cols-7 pb-1 text-center text-xs font-semibold text-muted-foreground" aria-hidden>
              {WEEKDAYS.map((d) => (
                <div key={d} className="py-1">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((day) => {
                const list = eventsOn(day)
                const muted = !isSameMonth(day, cursor)
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "flex min-h-[64px] flex-col rounded-lg border p-1 sm:min-h-[104px] sm:p-1.5",
                      muted ? "bg-surface/60 text-muted-foreground/60" : "bg-white",
                      isToday(day) && "border-brand ring-1 ring-brand",
                    )}
                  >
                    <button
                      className={cn(
                        "grid size-7 place-items-center self-start rounded-full text-xs font-semibold transition-colors hover:bg-muted",
                        isToday(day) && "bg-brand text-white hover:bg-brand",
                      )}
                      aria-label={`${format(day, "d 'de' MMMM", { locale: ptBR })}${list.length ? `, ${list.length} compromisso(s)` : ""}${canCreate ? ". Clique para agendar" : ""}`}
                      onClick={() => {
                        if (canCreate) {
                          setNewDate(day)
                          setEditing("new")
                        } else if (list[0]) setSelected(list[0])
                      }}
                    >
                      {format(day, "d")}
                    </button>
                    {isLoading ? (
                      <Skeleton className="mt-1 h-3 w-full" />
                    ) : (
                      <ul className="mt-0.5 space-y-0.5">
                        {list.slice(0, 3).map((e) => (
                          <li key={e.id}>
                            <button
                              onClick={() => setSelected(e)}
                              className="flex w-full items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight transition-colors hover:bg-muted"
                              style={{ color: eventDotColor[e.type] }}
                            >
                              <span className="size-1.5 shrink-0 rounded-full" style={{ backgroundColor: eventDotColor[e.type] }} aria-hidden />
                              <span className="hidden truncate font-medium text-navy sm:inline">{e.title}</span>
                              <span className="sr-only sm:hidden">{e.title}</span>
                            </button>
                          </li>
                        ))}
                        {list.length > 3 && <li className="px-1 text-[10px] text-muted-foreground">+{list.length - 3} mais</li>}
                      </ul>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <ol className="divide-y">
            {days.map((day) => {
              const list = eventsOn(day)
              return (
                <li key={day.toISOString()} className={cn("flex flex-col gap-2 p-4 sm:flex-row sm:gap-6", isToday(day) && "bg-brand-50/50")}>
                  <div className="w-28 shrink-0">
                    <p className={cn("text-sm font-bold capitalize", isToday(day) ? "text-brand" : "text-navy")}>{format(day, "EEEE", { locale: ptBR })}</p>
                    <p className="text-xs text-muted-foreground">{format(day, "dd/MM")}</p>
                  </div>
                  {isLoading ? (
                    <Skeleton className="h-10 flex-1" />
                  ) : list.length === 0 ? (
                    <p className="self-center text-sm text-muted-foreground">Sem compromissos</p>
                  ) : (
                    <ul className="flex-1 space-y-2">
                      {list.map((e) => (
                        <li key={e.id}>
                          <button onClick={() => setSelected(e)} className="flex w-full items-center gap-3 rounded-lg border bg-white p-2.5 text-left transition-colors hover:border-brand/40">
                            <EventIcon type={e.type} className="size-9" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold text-navy">{e.title}</span>
                              <span className="block text-xs text-muted-foreground">
                                {e.allDay ? "Dia todo" : `${fmtTime(e.startsAt)}${e.endsAt !== e.startsAt ? ` – ${fmtTime(e.endsAt)}` : ""}`}
                                {e.subject && ` · ${e.subject.name}`}
                                {e.className && ` · ${e.className}`}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ol>
        )}
        {!isLoading && !error && events.length === 0 && (
          <div className="p-4 pt-0">
            <EmptyState title="Nenhum compromisso neste período" description="Ajuste os filtros ou navegue para outro período." className="py-6" />
          </div>
        )}
      </div>

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="sm:max-w-md">
          {selected && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <EventIcon type={selected.type} />
                  <div className="text-left">
                    <p className="text-xs font-semibold text-muted-foreground uppercase">{selected.source === "atividade" ? "Prazo de atividade" : eventTypeLabel[selected.type]}</p>
                    <DialogTitle className="text-navy">{selected.title}</DialogTitle>
                  </div>
                </div>
                <DialogDescription className="sr-only">Detalhes do compromisso</DialogDescription>
              </DialogHeader>
              <dl className="space-y-2.5 text-sm">
                <div className="flex items-center gap-2.5">
                  <Clock className="size-4 text-muted-foreground" aria-hidden />
                  <dd className="capitalize">
                    {format(new Date(selected.startsAt), "EEEE, d 'de' MMMM", { locale: ptBR })}
                    {!selected.allDay && ` · ${fmtTime(selected.startsAt)}${selected.endsAt !== selected.startsAt ? ` – ${fmtTime(selected.endsAt)}` : ""}`}
                  </dd>
                </div>
                {selected.location && (
                  <div className="flex items-center gap-2.5">
                    <MapPin className="size-4 text-muted-foreground" aria-hidden />
                    <dd>{selected.location}</dd>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Users className="size-4 text-muted-foreground" aria-hidden />
                  <dd>
                    {selected.className ?? "Toda a escola"}
                    {selected.subject && ` · ${selected.subject.name}`}
                  </dd>
                </div>
              </dl>
              {selected.description && <p className="rounded-lg bg-surface p-3 text-sm text-navy">{selected.description}</p>}
              <div className="flex flex-wrap justify-end gap-2">
                {selected.href && (
                  <Button asChild variant="outline">
                    <Link href={selected.href}>
                      <ExternalLink /> Abrir atividade
                    </Link>
                  </Button>
                )}
                {selected.editable && (
                  <>
                    <ConfirmAction
                      trigger={
                        <Button variant="destructive">
                          <Trash2 /> Excluir
                        </Button>
                      }
                      title="Excluir compromisso?"
                      description="Ele deixará de aparecer na agenda de todos os participantes."
                      confirmLabel="Excluir"
                      onConfirm={() => remove.mutate(selected.id)}
                    />
                    <Button
                      onClick={() => {
                        setEditing(selected)
                        setSelected(null)
                      }}
                    >
                      <Pencil /> Editar
                    </Button>
                  </>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {canCreate && editing && (
        <EventFormDialog
          event={editing === "new" ? null : editing}
          defaultDate={newDate}
          onClose={() => setEditing(null)}
        />
      )}
    </>
  )
}
