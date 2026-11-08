"use client"

import { ArrowLeft, CheckCircle2, Clock, Download, FileText, Loader2, Pencil, Trash2, XCircle } from "lucide-react"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { useState } from "react"
import { ActivityFormDialog } from "@/components/features/activities/activity-form"
import { SubjectTag, UserAvatar } from "@/components/shared/badges"
import { ConfirmAction } from "@/components/shared/confirm-button"
import { FormField } from "@/components/shared/form-field"
import { Panel } from "@/components/shared/panel"
import { StatCard } from "@/components/shared/stat-card"
import { ErrorState, ListSkeleton, PageSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { SubmissionView } from "@/lib/data/repository"
import { downloadFile } from "@/lib/files"
import { activityTypeLabel, fmtDateTime, fmtScore } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

function GradeDialog({ submission, maxScore, onClose }: { submission: SubmissionView; maxScore: number; onClose: () => void }) {
  const [score, setScore] = useState(submission.score != null ? String(submission.score) : "")
  const [feedback, setFeedback] = useState(submission.feedback ?? "")
  const value = Number(score.replace(",", "."))
  const invalid = score === "" || Number.isNaN(value) || value < 0 || value > maxScore
  const grade = useRepoMutation((r, v: { score: number; feedback: string }) => r.gradeSubmission(submission.id, v), {
    success: `Correção salva. ${submission.student.name.split(" ")[0]} foi notificado(a).`,
    onSuccess: onClose,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-navy">Corrigir entrega</DialogTitle>
          <DialogDescription>
            {submission.student.name} · enviada em {fmtDateTime(submission.submittedAt)}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {submission.text && <p className="max-h-48 overflow-y-auto rounded-lg bg-surface p-3 text-[15px] whitespace-pre-line text-navy">{submission.text}</p>}
          {submission.file && (
            <Button variant="outline" size="sm" onClick={() => downloadFile(submission.file!)}>
              <FileText /> {submission.file.name}
            </Button>
          )}
        </div>
        <form
          id="grade-form"
          className="grid gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            if (!invalid) grade.mutate({ score: value, feedback })
          }}
        >
          <FormField id="gr-score" label={`Nota (0 a ${maxScore})`} error={score !== "" && invalid ? `Informe um valor entre 0 e ${maxScore}.` : undefined} required>
            <Input id="gr-score" inputMode="decimal" value={score} onChange={(e) => setScore(e.target.value)} className="w-32 text-lg font-semibold" autoFocus aria-invalid={score !== "" && invalid} />
          </FormField>
          <FormField id="gr-feedback" label="Comentário para o aluno" hint="Um retorno respeitoso e construtivo ajuda no aprendizado.">
            <Textarea id="gr-feedback" rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} maxLength={1000} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="grade-form" disabled={invalid || grade.isPending}>
            {grade.isPending && <Loader2 className="animate-spin" />} Salvar correção
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function TeacherActivityDetail() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: a, isLoading, error, refetch } = useRepoQuery(["activity", id], (r) => r.getActivity(id))
  const subs = useRepoQuery(["submissions", id], (r) => r.listSubmissions(id))
  const roster = useRepoQuery(["roster", a?.classId], (r) => r.getClassRoster(a!.classId), { enabled: Boolean(a) })
  const [grading, setGrading] = useState<SubmissionView | null>(null)
  const [editing, setEditing] = useState(false)
  const [filter, setFilter] = useState<"todos" | "corrigir" | "pendentes">("todos")
  const remove = useRepoMutation((r) => r.deleteActivity(id), { success: "Atividade excluída.", onSuccess: () => router.replace("/professor/atividades") })

  if (isLoading) return <PageSkeleton />
  if (error || !a) return <ErrorState error={error} onRetry={refetch} />

  const byStudent = new Map((subs.data ?? []).map((s) => [s.studentId, s]))
  const rows = (roster.data ?? [])
    .map((st) => ({ student: st, sub: byStudent.get(st.id) ?? null }))
    .filter((r) => (filter === "corrigir" ? r.sub?.status === "entregue" : filter === "pendentes" ? !r.sub : true))
  const s = a.stats!
  const graded = (subs.data ?? []).filter((x) => x.score != null)
  const avg = graded.length ? graded.reduce((t, x) => t + (x.score ?? 0), 0) / graded.length : null

  return (
    <div className="space-y-5">
      <Link href="/professor/atividades" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Atividades
      </Link>
      <Panel>
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <SubjectTag subject={a.subject} />
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-navy">{a.schoolClass.name}</span>
              <span className="text-xs text-muted-foreground">
                {activityTypeLabel[a.type]} · vale {a.maxScore} pts
              </span>
            </div>
            <h1 className="mt-2 text-xl font-bold text-navy sm:text-2xl">{a.title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">Prazo: {fmtDateTime(a.dueAt)}</p>
            <p className="mt-3 max-w-3xl text-[15px] whitespace-pre-line text-foreground/85">{a.description}</p>
            {a.attachment && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => downloadFile(a.attachment!)}>
                <Download /> {a.attachment.name}
              </Button>
            )}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button variant="outline" onClick={() => setEditing(true)}>
              <Pencil /> Editar
            </Button>
            <ConfirmAction
              trigger={
                <Button variant="destructive" aria-label="Excluir atividade">
                  <Trash2 />
                </Button>
              }
              title="Excluir atividade?"
              description="As entregas dos alunos também serão removidas. Esta ação não pode ser desfeita."
              confirmLabel="Excluir"
              onConfirm={() => remove.mutate(undefined)}
            />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Entregaram" value={`${s.submitted}/${s.students}`} icon={CheckCircle2} tone="success" />
        <StatCard label="A corrigir" value={s.toGrade} icon={Clock} tone="reward" />
        <StatCard label="Sem entrega" value={s.students - s.submitted} icon={XCircle} tone="navy" />
        <StatCard label="Média da turma" value={avg != null ? fmtScore(avg) : "—"} icon={FileText} tone="brand" hint={`de ${a.maxScore} pontos`} />
      </div>

      <Panel
        title="Entregas dos alunos"
        bodyClassName="px-0"
      >
        <div className="flex flex-wrap gap-1.5 px-5 pb-3" role="group" aria-label="Filtrar entregas">
          {(
            [
              ["todos", "Todos"],
              ["corrigir", `A corrigir (${s.toGrade})`],
              ["pendentes", `Sem entrega (${s.students - s.submitted})`],
            ] as const
          ).map(([v, l]) => (
            <button
              key={v}
              aria-pressed={filter === v}
              onClick={() => setFilter(v)}
              className={cn("rounded-full px-3 py-1 text-sm font-medium transition-colors", filter === v ? "bg-navy text-white" : "bg-muted text-muted-foreground hover:text-navy")}
            >
              {l}
            </button>
          ))}
        </div>
        {roster.isLoading || subs.isLoading ? (
          <ListSkeleton className="px-5" />
        ) : (
          <ul className="divide-y border-t">
            {rows.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted-foreground">Nenhum aluno neste filtro.</li>}
            {rows.map(({ student, sub }) => (
              <li key={student.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
                <UserAvatar user={student} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-navy">{student.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {sub ? `Enviada ${fmtDateTime(sub.submittedAt)}${sub.submittedAt > a.dueAt ? " · fora do prazo" : ""}` : "Ainda não entregou"}
                  </p>
                </div>
                {sub?.status === "corrigida" ? (
                  <button onClick={() => setGrading(sub)} className="rounded-lg bg-success-50 px-3 py-1.5 text-sm font-bold text-success tabular-nums hover:bg-success/15" aria-label={`Nota ${fmtScore(sub.score)}. Editar correção de ${student.name}`}>
                    {fmtScore(sub.score)} <span className="text-xs font-medium">/ {a.maxScore}</span>
                  </button>
                ) : sub ? (
                  <Button size="sm" onClick={() => setGrading(sub)}>
                    Corrigir
                  </Button>
                ) : (
                  <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">Pendente</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {grading && <GradeDialog submission={grading} maxScore={a.maxScore} onClose={() => setGrading(null)} />}
      {editing && <ActivityFormDialog activity={a} onClose={() => setEditing(false)} />}
    </div>
  )
}
