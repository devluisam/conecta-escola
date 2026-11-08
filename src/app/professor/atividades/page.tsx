"use client"

import { CalendarClock, ClipboardList, FilePen, Plus, Search } from "lucide-react"
import Link from "next/link"
import { useMemo, useState } from "react"
import { ActivityFormDialog } from "@/components/features/activities/activity-form"
import { SubjectTag } from "@/components/shared/badges"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { activityTypeLabel, dueLabel, fmtDateTime } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

export default function TeacherActivitiesPage() {
  const { data, isLoading, error, refetch } = useRepoQuery(["activities"], (r) => r.listActivities())
  const [creating, setCreating] = useState(false)
  const [q, setQ] = useState("")
  const [ctxFilter, setCtxFilter] = useState("all")
  const [status, setStatus] = useState("all")

  const contexts = useMemo(
    () => [...new Map((data ?? []).map((a) => [`${a.classId}|${a.subjectId}`, `${a.schoolClass.name} · ${a.subject.name}`])).entries()],
    [data],
  )
  const now = new Date().toISOString()
  const list = (data ?? [])
    .filter((a) => {
      if (ctxFilter !== "all" && `${a.classId}|${a.subjectId}` !== ctxFilter) return false
      if (status === "corrigir" && !a.stats?.toGrade) return false
      if (status === "abertas" && (a.dueAt < now || a.status !== "publicada")) return false
      if (status === "rascunho" && a.status !== "rascunho") return false
      return !q || a.title.toLowerCase().includes(q.toLowerCase())
    })
    .sort((a, b) => (b.stats?.toGrade ?? 0) - (a.stats?.toGrade ?? 0) || b.dueAt.localeCompare(a.dueAt))

  return (
    <>
      <PageHeader
        title="Atividades"
        description="Cadastre atividades, defina prazos e acompanhe as entregas das suas turmas."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Nova atividade
          </Button>
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar atividade" className="pl-9" aria-label="Buscar atividade" />
        </div>
        <Select value={ctxFilter} onValueChange={setCtxFilter}>
          <SelectTrigger className="w-full sm:w-60" aria-label="Filtrar por turma">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as turmas</SelectItem>
            {contexts.map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-full sm:w-48" aria-label="Filtrar por situação">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="corrigir">Com entregas a corrigir</SelectItem>
            <SelectItem value="abertas">Prazo aberto</SelectItem>
            <SelectItem value="rascunho">Rascunhos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma atividade encontrada"
          description="Crie a primeira atividade para uma das suas turmas."
          action={
            <Button onClick={() => setCreating(true)}>
              <Plus /> Nova atividade
            </Button>
          }
        />
      ) : (
        <ul className="grid gap-3">
          {list.map((a) => {
            const s = a.stats!
            const pct = s.students ? Math.round((s.submitted / s.students) * 100) : 0
            return (
              <li key={a.id}>
                <Link href={`/professor/atividades/${a.id}`} className="group flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/[0.06] transition-all hover:shadow-[0_8px_24px_-14px_rgba(7,29,58,0.3)] md:flex-row md:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <SubjectTag subject={a.subject} />
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-navy">{a.schoolClass.name}</span>
                      <span className="text-xs text-muted-foreground">{activityTypeLabel[a.type]}</span>
                      {a.status === "rascunho" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          <FilePen className="size-3" aria-hidden /> Rascunho
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-semibold text-navy group-hover:text-brand">{a.title}</p>
                    <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                      <CalendarClock className="size-3.5" aria-hidden /> {fmtDateTime(a.dueAt)} · {dueLabel(a.dueAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 md:w-72">
                    <div className="flex-1">
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-muted-foreground">Entregas</span>
                        <span className="font-semibold text-navy tabular-nums">
                          {s.submitted}/{s.students}
                        </span>
                      </div>
                      <Progress value={pct} className="h-2" aria-label={`${pct}% entregaram`} />
                    </div>
                    <span
                      className={cn(
                        "shrink-0 rounded-lg px-2.5 py-1.5 text-center text-xs font-semibold",
                        s.toGrade ? "bg-reward-50 text-reward-700" : "bg-success-50 text-success",
                      )}
                    >
                      {s.toGrade ? `${s.toGrade} a corrigir` : "Em dia"}
                    </span>
                  </div>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {creating && <ActivityFormDialog activity={null} onClose={() => setCreating(false)} />}
    </>
  )
}
