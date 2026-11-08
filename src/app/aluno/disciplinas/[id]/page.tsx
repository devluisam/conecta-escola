"use client"

import { ArrowLeft, BookOpen, ClipboardCheck, FileText, MessageCircle } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { TaskStatusBadge, UserAvatar } from "@/components/shared/badges"
import { Panel } from "@/components/shared/panel"
import { EmptyState, ErrorState, PageSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { average } from "@/lib/academic"
import { dueLabel, fmtDate, fmtScore, materialTypeLabel } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"

export default function StudentSubjectDetail() {
  const { id } = useParams<{ id: string }>()
  const subjects = useRepoQuery(["subjects"], (r) => r.listSubjects())
  const activities = useRepoQuery(["activities", { subjectId: id }], (r) => r.listActivities({ subjectId: id }))
  const materials = useRepoQuery(["materials"], (r) => r.listMaterials())
  const grades = useRepoQuery(["grades", { subjectId: id }], (r) => r.listGrades({ subjectId: id }))

  if (subjects.isLoading) return <PageSkeleton />
  const s = subjects.data?.find((x) => x.id === id)
  if (subjects.error || !s) return <ErrorState error={subjects.error ?? new Error("Disciplina não encontrada na sua turma.")} />
  const mats = (materials.data ?? []).filter((m) => m.subjectId === id)
  const byTerm = [1, 2, 3, 4].map((t) => average((grades.data ?? []).filter((g) => g.term === t).map((g) => (g.score / g.maxScore) * 10)))

  return (
    <div className="space-y-5">
      <Link href="/aluno/disciplinas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Minhas disciplinas
      </Link>
      <div className="flex flex-col gap-4 rounded-2xl p-6 text-white sm:flex-row sm:items-center sm:justify-between" style={{ background: `linear-gradient(120deg, ${s.color}, #071D3A)` }}>
        <div>
          <p className="text-xs font-semibold tracking-wider opacity-80">
            {s.code} · {s.className}
          </p>
          <h1 className="text-2xl font-bold">{s.name}</h1>
          {s.teacher && (
            <p className="mt-2 flex items-center gap-2 text-sm opacity-90">
              <UserAvatar user={s.teacher} size="sm" className="ring-2 ring-white/40" /> {s.teacher.name}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {s.teacher && (
            <Button asChild variant="secondary" className="bg-white/15 text-white hover:bg-white/25">
              <Link href={`/aluno/comunicacao?para=${s.teacher.id}`}>
                <MessageCircle /> Falar com o professor
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Notas por bimestre">
          <ul className="grid grid-cols-4 gap-2 text-center">
            {byTerm.map((v, i) => (
              <li key={i} className="rounded-lg bg-surface py-3">
                <p className="text-[11px] text-muted-foreground">{i + 1}º bim.</p>
                <p className="text-lg font-bold text-navy tabular-nums">{fmtScore(v)}</p>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-muted-foreground">
            Média atual: <strong className="text-navy">{fmtScore(s.average)}</strong>
          </p>
          <Link href="/aluno/notas" className="mt-2 inline-block text-[13px] font-semibold text-brand hover:underline">
            Ver boletim completo
          </Link>
        </Panel>

        <Panel title={`Atividades (${activities.data?.length ?? 0})`} className="lg:col-span-2">
          {(activities.data ?? []).length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="Nenhuma atividade" className="py-6" />
          ) : (
            <ul className="divide-y">
              {[...(activities.data ?? [])].reverse().map((a) => (
                <li key={a.id}>
                  <Link href={`/aluno/tarefas/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-muted/40">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">{a.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {a.studentStatus === "corrigida" ? `Nota ${fmtScore(a.mySubmission?.score)} / ${a.maxScore}` : dueLabel(a.dueAt)}
                      </span>
                    </span>
                    {a.studentStatus && <TaskStatusBadge status={a.studentStatus} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Materiais da disciplina" className="lg:col-span-3" action={{ label: "Abrir biblioteca", href: "/aluno/biblioteca" }}>
          {mats.length === 0 ? (
            <EmptyState icon={BookOpen} title="Nenhum material publicado" className="py-6" />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {mats.map((m) => (
                <li key={m.id}>
                  <Link href={`/aluno/biblioteca?abrir=${m.id}`} className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:border-brand/40">
                    <FileText className="size-5 shrink-0" style={{ color: s.color }} aria-hidden />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold text-navy">{m.title}</span>
                      <span className="text-xs text-muted-foreground">
                        {materialTypeLabel[m.type]} · {fmtDate(m.createdAt)}
                      </span>
                    </span>
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
