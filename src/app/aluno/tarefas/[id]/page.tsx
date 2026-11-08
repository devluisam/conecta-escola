"use client"

import { ArrowLeft, CalendarClock, CheckCircle2, Download, FileText, Loader2, MessageSquareQuote, Send, Star, UserRound } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { SubjectTag, TaskStatusBadge } from "@/components/shared/badges"
import { FilePicker } from "@/components/shared/file-picker"
import { Panel } from "@/components/shared/panel"
import { ErrorState, PageSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { downloadFile } from "@/lib/files"
import { activityTypeLabel, dueLabel, fmtBytes, fmtDateTime, fmtScore } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { FileRef } from "@/lib/types"

export default function StudentTaskDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: a, isLoading, error, refetch } = useRepoQuery(["activity", id], (r) => r.getActivity(id))
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState("")
  const [file, setFile] = useState<FileRef | null>(null)
  const submit = useRepoMutation((r, input: { text: string; file: FileRef | null }) => r.submitActivity(id, input), {
    success: "Atividade enviada com sucesso! O professor foi notificado.",
    onSuccess: () => setEditing(false),
  })

  if (isLoading) return <PageSkeleton />
  if (error || !a) return <ErrorState error={error} onRetry={refetch} />

  const sub = a.mySubmission
  const canSubmit = a.studentStatus !== "corrigida"
  const showForm = canSubmit && (!sub || editing)
  const late = sub && sub.submittedAt > a.dueAt

  return (
    <div className="space-y-5">
      <Link href="/aluno/tarefas" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Voltar para tarefas
      </Link>

      <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
        <div className="space-y-5">
          <Panel>
            <div className="flex flex-wrap items-center gap-2">
              <SubjectTag subject={a.subject} />
              <span className="text-xs font-medium text-muted-foreground">{activityTypeLabel[a.type]}</span>
              {a.studentStatus && <TaskStatusBadge status={a.studentStatus} className="ml-auto" />}
            </div>
            <h1 className="mt-3 text-xl font-bold text-navy sm:text-2xl">{a.title}</h1>
            <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-foreground/85">{a.description}</p>
            {a.attachment && (
              <button
                onClick={() => downloadFile(a.attachment!)}
                className="mt-4 flex w-full items-center gap-3 rounded-lg border bg-surface px-3 py-2.5 text-left transition-colors hover:border-brand/40 sm:w-auto"
              >
                <FileText className="size-5 text-brand" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-navy">{a.attachment.name}</span>
                  <span className="block text-xs text-muted-foreground">{fmtBytes(a.attachment.size)} · material do professor</span>
                </span>
                <Download className="ml-2 size-4 text-muted-foreground" aria-hidden />
              </button>
            )}
          </Panel>

          {a.studentStatus === "corrigida" && sub && (
            <Panel title="Correção do professor">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                <div className="grid size-24 shrink-0 place-items-center rounded-2xl bg-success-50 text-success">
                  <div className="text-center">
                    <p className="text-3xl font-bold tabular-nums">{fmtScore(sub.score)}</p>
                    <p className="text-xs font-medium">de {a.maxScore}</p>
                  </div>
                </div>
                <div className="flex-1 rounded-xl bg-surface p-4">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <MessageSquareQuote className="size-4" aria-hidden /> {a.teacher.name}
                  </p>
                  <p className="mt-1.5 text-[15px] text-navy">{sub.feedback || "Sem comentários."}</p>
                  {sub.gradedAt && <p className="mt-2 text-xs text-muted-foreground">Corrigida em {fmtDateTime(sub.gradedAt)}</p>}
                </div>
              </div>
            </Panel>
          )}

          {sub && !editing && (
            <Panel title="Sua entrega">
              <p className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="size-4" aria-hidden /> Enviada em {fmtDateTime(sub.submittedAt)}
                {late && <span className="ml-1 rounded-full bg-amber-50 px-2 text-xs font-semibold text-amber-800">fora do prazo</span>}
              </p>
              {sub.text && <p className="mt-3 rounded-lg bg-surface p-3 text-[15px] whitespace-pre-line text-navy">{sub.text}</p>}
              {sub.file && (
                <button onClick={() => downloadFile(sub.file!)} className="mt-3 flex items-center gap-2 text-sm font-medium text-brand hover:underline">
                  <FileText className="size-4" /> {sub.file.name}
                </button>
              )}
              {canSubmit && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => {
                    setText(sub.text)
                    setFile(sub.file ?? null)
                    setEditing(true)
                  }}
                >
                  Editar entrega
                </Button>
              )}
            </Panel>
          )}

          {showForm && (
            <Panel title={sub ? "Editar entrega" : "Enviar resposta"}>
              <form
                className="space-y-4"
                onSubmit={(e) => {
                  e.preventDefault()
                  submit.mutate({ text, file })
                }}
              >
                <div className="space-y-2">
                  <Label htmlFor="answer">Sua resposta</Label>
                  <Textarea
                    id="answer"
                    rows={6}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="Escreva sua resposta, comentários ou observações para o professor…"
                    maxLength={5000}
                  />
                  <p className="text-right text-xs text-muted-foreground">{text.length}/5000</p>
                </div>
                <FilePicker value={file} onChange={setFile} maxMb={ctx.data?.settings.maxUploadMb ?? 2} />
                <div className="flex flex-wrap gap-2 border-t pt-4">
                  <Button type="submit" disabled={submit.isPending || (!text.trim() && !file)}>
                    {submit.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                    {submit.isPending ? "Enviando…" : "Enviar atividade"}
                  </Button>
                  {editing && (
                    <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </Panel>
          )}
        </div>

        <aside className="space-y-4">
          <Panel title="Detalhes">
            <dl className="space-y-3.5 text-sm">
              <div className="flex gap-3">
                <CalendarClock className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-xs text-muted-foreground">Prazo de entrega</dt>
                  <dd className="font-semibold text-navy">{fmtDateTime(a.dueAt)}</dd>
                  <dd className="text-xs text-muted-foreground">{dueLabel(a.dueAt)}</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <Star className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-xs text-muted-foreground">Pontuação máxima</dt>
                  <dd className="font-semibold text-navy">{a.maxScore} pontos</dd>
                </div>
              </div>
              <div className="flex gap-3">
                <UserRound className="mt-0.5 size-4 text-muted-foreground" aria-hidden />
                <div>
                  <dt className="text-xs text-muted-foreground">Professor(a)</dt>
                  <dd className="font-semibold text-navy">{a.teacher.name}</dd>
                  <dd>
                    <Link href={`/aluno/comunicacao?para=${a.teacher.id}`} className="text-xs font-semibold text-brand hover:underline">
                      Tirar dúvida com o professor
                    </Link>
                  </dd>
                </div>
              </div>
            </dl>
          </Panel>
        </aside>
      </div>
    </div>
  )
}
