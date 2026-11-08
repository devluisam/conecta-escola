"use client"

import { BookOpen, ClipboardCheck, Layers, TrendingUp } from "lucide-react"
import Link from "next/link"
import { UserAvatar } from "@/components/shared/badges"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/shared/states"
import { fmtScore } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

export default function StudentSubjectsPage() {
  const { data, isLoading, error, refetch } = useRepoQuery(["subjects"], (r) => r.listSubjects())
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())
  const passing = ctx.data?.settings.passingGrade ?? 6

  return (
    <>
      <PageHeader title="Minhas disciplinas" description={ctx.data?.schoolClass ? `${ctx.data.schoolClass.name} · ${ctx.data.schoolClass.series}` : "Disciplinas da sua turma"} />
      {isLoading ? (
        <GridSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon={Layers} title="Nenhuma disciplina" description="Você ainda não está matriculado(a) em uma turma." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((s) => (
            <li key={`${s.id}-${s.classId}`}>
              <Link
                href={`/aluno/disciplinas/${s.id}`}
                className="group block overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_rgba(7,29,58,0.35)]"
              >
                <div className="relative h-20 px-5 pt-4 text-white" style={{ background: `linear-gradient(120deg, ${s.color}, ${s.color}CC)` }}>
                  <p className="text-xs font-semibold tracking-wider opacity-85">{s.code}</p>
                  <p className="text-lg font-bold">{s.name}</p>
                  <BookOpen className="absolute top-4 right-4 size-10 opacity-20" aria-hidden />
                </div>
                <div className="space-y-4 p-5">
                  {s.teacher && (
                    <div className="flex items-center gap-2.5">
                      <UserAvatar user={s.teacher} size="sm" />
                      <div className="text-sm">
                        <p className="font-semibold text-navy">{s.teacher.name}</p>
                        <p className="text-xs text-muted-foreground">Professor(a) · {s.workload}h/ano</p>
                      </div>
                    </div>
                  )}
                  <dl className="grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-surface py-2">
                      <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                        <TrendingUp className="size-3" aria-hidden /> Média
                      </dt>
                      <dd className={cn("text-lg font-bold tabular-nums", s.average != null && s.average < passing ? "text-amber-700" : "text-navy")}>{fmtScore(s.average)}</dd>
                    </div>
                    <div className="rounded-lg bg-surface py-2">
                      <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                        <ClipboardCheck className="size-3" aria-hidden /> A fazer
                      </dt>
                      <dd className="text-lg font-bold text-navy tabular-nums">{s.pendingTasks}</dd>
                    </div>
                    <div className="rounded-lg bg-surface py-2">
                      <dt className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground">
                        <BookOpen className="size-3" aria-hidden /> Materiais
                      </dt>
                      <dd className="text-lg font-bold text-navy tabular-nums">{s.materialsCount}</dd>
                    </div>
                  </dl>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
