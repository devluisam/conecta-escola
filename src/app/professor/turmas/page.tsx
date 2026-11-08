"use client"

import { ArrowRight, DoorOpen, Sun, Users } from "lucide-react"
import Link from "next/link"
import { SubjectTag } from "@/components/shared/badges"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/shared/states"
import { useRepoQuery } from "@/lib/queries"

export default function TeacherClassesPage() {
  const { data, isLoading, error, refetch } = useRepoQuery(["my-classes"], (r) => r.listMyClasses())
  return (
    <>
      <PageHeader title="Minhas turmas" description="Turmas e disciplinas vinculadas a você pela coordenação." />
      {isLoading ? (
        <GridSkeleton items={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon={Users} title="Nenhuma turma vinculada" description="Peça à coordenação para vincular você às suas turmas." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <li key={c.id}>
              <Link href={`/professor/turmas/${c.id}`} className="group block rounded-xl bg-card p-5 ring-1 ring-foreground/[0.06] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_rgba(7,29,58,0.35)]">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xl font-bold text-navy">{c.name}</p>
                    <p className="text-sm text-muted-foreground">{c.series}</p>
                  </div>
                  <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand">
                    <Users className="size-5" aria-hidden />
                  </span>
                </div>
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {c.mySubjects.map((s) => (
                    <SubjectTag key={s.id} subject={s} />
                  ))}
                </div>
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t pt-4 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Alunos</dt>
                    <dd className="font-bold text-navy">{c.students}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Sun className="size-3" aria-hidden /> Turno
                    </dt>
                    <dd className="font-semibold text-navy">{c.shift}</dd>
                  </div>
                  <div>
                    <dt className="flex items-center gap-1 text-xs text-muted-foreground">
                      <DoorOpen className="size-3" aria-hidden /> Sala
                    </dt>
                    <dd className="font-semibold text-navy">{c.room ?? "—"}</dd>
                  </div>
                </dl>
                <p className="mt-4 flex items-center gap-1 text-sm font-semibold text-brand">
                  Ver alunos e desempenho <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
