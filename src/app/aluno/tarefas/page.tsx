"use client"

import { CalendarClock, ClipboardCheck, Search } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense, useMemo, useState } from "react"
import { PageHeader } from "@/components/shared/page-header"
import { SubjectTag, TaskStatusBadge } from "@/components/shared/badges"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/states"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { activityTypeLabel, dueLabel, fmtDateTime, fmtScore } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

type Filter = "todas" | "pendentes" | "concluidas"

function TasksContent() {
  const params = useSearchParams()
  const router = useRouter()
  const initial = (params.get("status") as Filter) ?? "todas"
  const [tab, setTab] = useState<Filter>(["todas", "pendentes", "concluidas"].includes(initial) ? initial : "todas")
  const [subject, setSubject] = useState("all")
  const [q, setQ] = useState("")
  const { data, isLoading, error, refetch } = useRepoQuery(["activities"], (r) => r.listActivities())

  const subjects = useMemo(() => [...new Map((data ?? []).map((a) => [a.subjectId, a.subject])).values()], [data])
  const list = useMemo(() => {
    const items = (data ?? []).filter((a) => {
      const pending = a.studentStatus === "pendente" || a.studentStatus === "atrasada"
      if (tab === "pendentes" && !pending) return false
      if (tab === "concluidas" && pending) return false
      if (subject !== "all" && a.subjectId !== subject) return false
      return !q || a.title.toLowerCase().includes(q.toLowerCase())
    })
    // Pendentes: prazo mais próximo primeiro; concluídas: mais recentes primeiro.
    return tab === "concluidas" ? items.reverse() : items.sort((a, b) => Number(b.studentStatus === "atrasada") - Number(a.studentStatus === "atrasada"))
  }, [data, tab, subject, q])

  const count = (f: Filter) =>
    (data ?? []).filter((a) => {
      const pending = a.studentStatus === "pendente" || a.studentStatus === "atrasada"
      return f === "todas" || (f === "pendentes" ? pending : !pending)
    }).length

  return (
    <>
      <PageHeader title="Tarefas e atividades" description="Acompanhe prazos, envie suas respostas e veja as correções dos professores." />
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as Filter)
            router.replace(`/aluno/tarefas?status=${v}`, { scroll: false })
          }}
        >
          <TabsList className="h-10 bg-white ring-1 ring-foreground/[0.06]">
            <TabsTrigger value="todas" className="px-3">Todas ({count("todas")})</TabsTrigger>
            <TabsTrigger value="pendentes" className="px-3">Pendentes ({count("pendentes")})</TabsTrigger>
            <TabsTrigger value="concluidas" className="px-3">Concluídas ({count("concluidas")})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar atividade" className="pl-9 sm:w-60" aria-label="Buscar atividade" />
          </div>
          <Select value={subject} onValueChange={setSubject}>
            <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por disciplina">
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
        </div>
      </div>

      {isLoading ? (
        <ListSkeleton rows={6} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState
          icon={ClipboardCheck}
          title={tab === "pendentes" ? "Nenhuma tarefa pendente 🎉" : "Nenhuma atividade encontrada"}
          description={tab === "pendentes" ? "Você está em dia com suas entregas." : "Ajuste os filtros para ver outras atividades."}
        />
      ) : (
        <ul className="grid gap-3">
          {list.map((a) => (
            <li key={a.id}>
              <Link
                href={`/aluno/tarefas/${a.id}`}
                className={cn(
                  "group flex flex-col gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/[0.06] transition-all hover:shadow-[0_8px_24px_-14px_rgba(7,29,58,0.3)] sm:flex-row sm:items-center",
                  a.studentStatus === "atrasada" && "ring-red-200",
                )}
              >
                <span className="hidden h-12 w-1.5 shrink-0 rounded-full sm:block" style={{ backgroundColor: a.subject.color }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <SubjectTag subject={a.subject} />
                    <span className="text-xs text-muted-foreground">{activityTypeLabel[a.type]}</span>
                  </div>
                  <p className="mt-1.5 font-semibold text-navy group-hover:text-brand">{a.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
                    <CalendarClock className="size-3.5" aria-hidden />
                    {fmtDateTime(a.dueAt)} · {a.teacher.name}
                  </p>
                </div>
                <div className="flex items-center justify-between gap-3 sm:flex-col sm:items-end">
                  {a.studentStatus && <TaskStatusBadge status={a.studentStatus} />}
                  <span className={cn("text-[13px] font-medium", a.studentStatus === "atrasada" ? "text-red-700" : "text-muted-foreground")}>
                    {a.studentStatus === "corrigida"
                      ? `Nota ${fmtScore(a.mySubmission?.score)} de ${a.maxScore}`
                      : a.studentStatus === "entregue"
                        ? "Aguardando correção"
                        : dueLabel(a.dueAt)}
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export default function StudentTasksPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <TasksContent />
    </Suspense>
  )
}
