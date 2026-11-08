"use client"

import { Award, BarChart3, ChevronDown, TrendingUp } from "lucide-react"
import { Fragment, useMemo, useState } from "react"
import { SubjectAverageChart, TermEvolutionChart } from "@/components/charts/performance-charts"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { StatCard } from "@/components/shared/stat-card"
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { averageBySubject, averageBySubjectTerm, overallAverage, termEvolution } from "@/lib/academic"
import { fmtDate, fmtScore } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

export default function StudentGradesPage() {
  const { data, isLoading, error, refetch } = useRepoQuery(["grades"], (r) => r.listGrades())
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())
  const [open, setOpen] = useState<string | null>(null)
  const settings = ctx.data?.settings
  const passing = settings?.passingGrade ?? 6
  const terms = settings?.currentTerm ?? 4

  const bySubject = useMemo(() => averageBySubject(data ?? []), [data])
  const byTerm = useMemo(() => averageBySubjectTerm(data ?? []), [data])
  const evolution = useMemo(() => termEvolution(data ?? [], terms), [data, terms])

  if (isLoading) return <PageSkeleton />
  if (error) return <ErrorState error={error} onRetry={refetch} />
  if (!data?.length)
    return (
      <>
        <PageHeader title="Notas e desempenho" />
        <EmptyState icon={BarChart3} title="Nenhuma nota lançada" description="Quando os professores lançarem notas, elas aparecerão aqui." />
      </>
    )

  const overall = overallAverage(data) ?? 0
  const best = [...bySubject].sort((a, b) => b.average - a.average)[0]
  const firstTerm = evolution[0]
  const lastTerm = evolution[evolution.length - 1]
  const termAvg = (row: Record<string, number | string | null>) => {
    const vals = Object.entries(row).filter(([k, v]) => k !== "term" && typeof v === "number") as [string, number][]
    return vals.length ? vals.reduce((s, [, v]) => s + v, 0) / vals.length : 0
  }
  const trend = termAvg(lastTerm) - termAvg(firstTerm)

  return (
    <>
      <PageHeader title="Notas e desempenho" description={`Boletim digital ${settings?.schoolYear ?? ""} · média mínima para aprovação: ${passing}`} />
      <div className="mb-5 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Média geral" value={fmtScore(overall)} icon={BarChart3} tone="brand" hint={`${bySubject.length} disciplinas`} />
        <StatCard label="Destaque" value={best ? fmtScore(best.average) : "—"} icon={Award} tone="reward" hint={best?.name} />
        <StatCard label="Evolução no ano" value={`${trend >= 0 ? "+" : ""}${fmtScore(trend)}`} icon={TrendingUp} tone={trend >= 0 ? "success" : "navy"} hint="Do 1º ao bimestre atual" />
      </div>

      <div className="mb-5 grid gap-4 lg:grid-cols-2">
        <Panel title="Média por disciplina">
          <SubjectAverageChart data={bySubject} passing={passing} />
        </Panel>
        <Panel title="Evolução por bimestre">
          <TermEvolutionChart data={evolution} series={bySubject.map((s) => ({ key: s.subject.id, name: s.name, color: s.color }))} height={220} />
        </Panel>
      </div>

      <Panel title="Boletim" bodyClassName="px-0 pb-2">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Disciplina</TableHead>
                {Array.from({ length: 4 }, (_, i) => (
                  <TableHead key={i} className="text-center">
                    {i + 1}º bim.
                  </TableHead>
                ))}
                <TableHead className="text-center">Média</TableHead>
                <TableHead className="pr-5">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bySubject.map((s) => {
                const evals = data.filter((g) => g.subjectId === s.subject.id).sort((a, b) => a.term - b.term || a.createdAt.localeCompare(b.createdAt))
                const isOpen = open === s.subject.id
                return (
                  <Fragment key={s.subject.id}>
                    <TableRow className="cursor-pointer" onClick={() => setOpen(isOpen ? null : s.subject.id)}>
                      <TableCell className="pl-5">
                        <button className="flex items-center gap-2 font-semibold text-navy" aria-expanded={isOpen} aria-label={`${s.name}: ver avaliações`}>
                          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", isOpen && "rotate-180")} aria-hidden />
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                          {s.name}
                        </button>
                      </TableCell>
                      {[1, 2, 3, 4].map((t) => {
                        const v = byTerm[s.subject.id]?.[t]
                        return (
                          <TableCell key={t} className={cn("text-center tabular-nums", v != null && v < passing && "font-semibold text-amber-700")}>
                            {t > terms ? <span className="text-muted-foreground/50">—</span> : fmtScore(v)}
                          </TableCell>
                        )
                      })}
                      <TableCell className="text-center font-bold text-navy tabular-nums">{fmtScore(s.average)}</TableCell>
                      <TableCell className="pr-5">
                        {s.average >= passing ? (
                          <span className="rounded-full bg-success-50 px-2 py-0.5 text-xs font-semibold text-success">Acima da média</span>
                        ) : (
                          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Precisa de reforço</span>
                        )}
                      </TableCell>
                    </TableRow>
                    {isOpen && (
                      <TableRow className="bg-surface/70 hover:bg-surface/70">
                        <TableCell colSpan={7} className="px-5 py-3">
                          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {evals.map((g) => (
                              <li key={g.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 ring-1 ring-foreground/5">
                                <span>
                                  <span className="block text-sm font-medium text-navy">
                                    {g.term}º bim. · {g.label}
                                  </span>
                                  <span className="text-xs text-muted-foreground">{fmtDate(g.updatedAt)}</span>
                                </span>
                                <span className="font-bold text-navy tabular-nums">
                                  {fmtScore(g.score)}
                                  <span className="text-xs font-normal text-muted-foreground"> / {g.maxScore}</span>
                                </span>
                              </li>
                            ))}
                          </ul>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        </div>
        <p className="px-5 pt-2 text-xs text-muted-foreground">
          As notas são lançadas somente pelos professores responsáveis. Dúvidas? Fale com o professor pela Comunicação.
        </p>
      </Panel>
    </>
  )
}
