"use client"

import { ArrowLeft, BookOpenCheck, MessageCircle, Search } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { SubjectAverageChart } from "@/components/charts/performance-charts"
import { SubjectTag, UserAvatar } from "@/components/shared/badges"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { ErrorState, ListSkeleton, PageSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { average, averageBySubject } from "@/lib/academic"
import { fmtScore } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

export default function TeacherClassDetail() {
  const { id } = useParams<{ id: string }>()
  const classes = useRepoQuery(["my-classes"], (r) => r.listMyClasses())
  const roster = useRepoQuery(["roster", id], (r) => r.getClassRoster(id))
  const grades = useRepoQuery(["grades", { classId: id }], (r) => r.listGrades({ classId: id }))
  const activities = useRepoQuery(["activities", { classId: id }], (r) => r.listActivities({ classId: id }))
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())
  const [q, setQ] = useState("")

  if (classes.isLoading) return <PageSkeleton />
  const c = classes.data?.find((x) => x.id === id)
  if (!c) return <ErrorState error={roster.error ?? new Error("Turma não encontrada entre as suas turmas.")} />
  const passing = ctx.data?.settings.passingGrade ?? 6
  const myActs = (activities.data ?? []).filter((a) => a.status === "publicada" && new Date(a.dueAt) < new Date())
  const studentAvg = (sid: string) => average((grades.data ?? []).filter((g) => g.studentId === sid).map((g) => (g.score / g.maxScore) * 10))
  const list = (roster.data ?? []).filter((s) => s.name.toLowerCase().includes(q.toLowerCase()) || s.matricula.includes(q))
  const needSupport = (roster.data ?? []).filter((s) => {
    const v = studentAvg(s.id)
    return v != null && v < passing
  }).length

  return (
    <div className="space-y-5">
      <Link href="/professor/turmas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Minhas turmas
      </Link>
      <PageHeader
        title={c.name}
        description={`${c.series} · ${c.shift} · ${c.students} alunos`}
        actions={
          <>
            <Button asChild variant="outline">
              <Link href="/professor/notas">
                <BookOpenCheck /> Lançar notas
              </Link>
            </Button>
          </>
        }
        className="mb-0"
      />
      <div className="flex flex-wrap gap-1.5">
        {c.mySubjects.map((s) => (
          <SubjectTag key={s.id} subject={s} />
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Média da turma nas suas disciplinas" className="lg:col-span-2">
          <SubjectAverageChart data={averageBySubject(grades.data ?? [])} passing={passing} height={200} />
        </Panel>
        <Panel title="Resumo">
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Atividades encerradas</dt>
              <dd className="font-semibold text-navy">{myActs.length}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Média geral</dt>
              <dd className="font-semibold text-navy">{fmtScore(average((grades.data ?? []).map((g) => (g.score / g.maxScore) * 10)))}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Alunos que precisam de reforço</dt>
              <dd className="font-semibold text-amber-700">{needSupport}</dd>
            </div>
          </dl>
          <p className="mt-4 rounded-lg bg-surface p-3 text-xs text-muted-foreground">
            Informações individuais de desempenho são visíveis apenas para você, para a coordenação e para o próprio aluno.
          </p>
        </Panel>
      </div>

      <Panel title="Alunos" bodyClassName="px-0 pb-2">
        <div className="px-5 pb-3">
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nome ou matrícula" className="pl-9" aria-label="Buscar aluno" />
          </div>
        </div>
        {roster.isLoading ? (
          <ListSkeleton className="px-5" />
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Aluno(a)</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead className="text-center">Média</TableHead>
                  <TableHead className="pr-5 text-right">Contato</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((s) => {
                  const v = studentAvg(s.id)
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="pl-5">
                        <span className="flex items-center gap-2.5">
                          <UserAvatar user={s} size="sm" />
                          <span className="font-medium text-navy">{s.name}</span>
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground tabular-nums">{s.matricula}</TableCell>
                      <TableCell className={cn("text-center font-semibold tabular-nums", v != null && v < passing ? "text-amber-700" : "text-navy")}>{fmtScore(v)}</TableCell>
                      <TableCell className="pr-5 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/professor/comunicacao?para=${s.id}`} aria-label={`Enviar mensagem para ${s.name}`}>
                            <MessageCircle /> Mensagem
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </Panel>
    </div>
  )
}
