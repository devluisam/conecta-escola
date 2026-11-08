"use client"

import { Loader2, Plus, ShieldCheck, Star, Trash2, Trophy, Users } from "lucide-react"
import { useMemo, useState } from "react"
import { categoryMeta } from "@/components/features/challenges/challenge-meta"
import { FormField } from "@/components/shared/form-field"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ChallengeInput } from "@/lib/data/repository"
import { fmtDate } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { ChallengeCategory, QuizQuestion } from "@/lib/types"
import { cn } from "@/lib/utils"

const emptyQuestion = (): QuizQuestion => ({ prompt: "", options: ["", "", "", ""], answer: 0 })

function ChallengeForm({ onClose }: { onClose: () => void }) {
  const contexts = useRepoQuery(["teaching-contexts"], (r) => r.listTeachingContexts())
  const classes = useMemo(() => [...new Map((contexts.data ?? []).map((c) => [c.schoolClass.id, c.schoolClass])).values()], [contexts.data])
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState<ChallengeCategory>("quiz")
  const [classId, setClassId] = useState("")
  const [points, setPoints] = useState("50")
  const [endsAt, setEndsAt] = useState(() => new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
  const [steps, setSteps] = useState<string[]>(["", ""])
  const [questions, setQuestions] = useState<QuizQuestion[]>([emptyQuestion()])
  const [error, setError] = useState<string | null>(null)
  const kind = category === "quiz" ? "quiz" : "checklist"

  const save = useRepoMutation((r, input: ChallengeInput) => r.saveChallenge(input), {
    success: "Desafio publicado! A turma foi notificada.",
    onSuccess: onClose,
  })
  const submit = () => {
    setError(null)
    if (title.trim().length < 3) return setError("Informe um título com pelo menos 3 caracteres.")
    if (!classId) return setError("Selecione a turma.")
    if (kind === "quiz" && questions.some((q) => !q.prompt.trim() || q.options.some((o) => !o.trim())))
      return setError("Preencha todas as perguntas e alternativas.")
    if (kind === "checklist" && !steps.some((s) => s.trim())) return setError("Adicione pelo menos uma etapa.")
    save.mutate({
      title,
      description,
      category,
      kind,
      points: Number(points),
      endsAt: new Date(`${endsAt}T23:59`).toISOString(),
      classId,
      steps: kind === "checklist" ? steps : undefined,
      questions: kind === "quiz" ? questions : undefined,
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-navy">Novo desafio</DialogTitle>
          <DialogDescription>Os pontos premiam a participação. Os alunos podem refazer quizzes para aprender.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField id="ch-title" label="Título" className="sm:col-span-2" required>
            <Input id="ch-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} />
          </FormField>
          <FormField id="ch-cat" label="Categoria">
            <Select value={category} onValueChange={(v) => setCategory(v as ChallengeCategory)}>
              <SelectTrigger id="ch-cat" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(categoryMeta) as ChallengeCategory[]).map((c) => (
                  <SelectItem key={c} value={c}>
                    {categoryMeta[c].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="ch-class" label="Turma" required>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="ch-class" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FormField>
          <FormField id="ch-points" label="Pontos">
            <Input id="ch-points" type="number" min={1} max={500} value={points} onChange={(e) => setPoints(e.target.value)} />
          </FormField>
          <FormField id="ch-end" label="Encerra em">
            <Input id="ch-end" type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
          </FormField>
          <FormField id="ch-desc" label="Descrição" className="sm:col-span-2">
            <Textarea id="ch-desc" rows={2} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={400} />
          </FormField>
        </div>

        {kind === "checklist" ? (
          <fieldset className="space-y-2">
            <legend className="mb-2 text-sm font-semibold text-navy">Etapas</legend>
            {steps.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input value={s} onChange={(e) => setSteps((x) => x.map((v, j) => (j === i ? e.target.value : v)))} placeholder={`Etapa ${i + 1}`} aria-label={`Etapa ${i + 1}`} />
                <Button variant="ghost" size="icon" onClick={() => setSteps((x) => x.filter((_, j) => j !== i))} disabled={steps.length === 1} aria-label={`Remover etapa ${i + 1}`}>
                  <Trash2 />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setSteps((x) => [...x, ""])}>
              <Plus /> Adicionar etapa
            </Button>
          </fieldset>
        ) : (
          <fieldset className="space-y-4">
            <legend className="mb-2 text-sm font-semibold text-navy">Perguntas</legend>
            {questions.map((q, qi) => (
              <div key={qi} className="rounded-xl border bg-surface/60 p-3">
                <div className="flex gap-2">
                  <Input
                    value={q.prompt}
                    onChange={(e) => setQuestions((x) => x.map((v, j) => (j === qi ? { ...v, prompt: e.target.value } : v)))}
                    placeholder={`Pergunta ${qi + 1}`}
                    aria-label={`Enunciado da pergunta ${qi + 1}`}
                  />
                  <Button variant="ghost" size="icon" onClick={() => setQuestions((x) => x.filter((_, j) => j !== qi))} disabled={questions.length === 1} aria-label={`Remover pergunta ${qi + 1}`}>
                    <Trash2 />
                  </Button>
                </div>
                <div className="mt-2 grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={`Alternativa correta da pergunta ${qi + 1}`}>
                  {q.options.map((o, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <input
                        type="radio"
                        name={`answer-${qi}`}
                        checked={q.answer === oi}
                        onChange={() => setQuestions((x) => x.map((v, j) => (j === qi ? { ...v, answer: oi } : v)))}
                        className="size-4 accent-[#22A06B]"
                        aria-label={`Marcar alternativa ${String.fromCharCode(65 + oi)} como correta`}
                      />
                      <Input
                        value={o}
                        onChange={(e) => setQuestions((x) => x.map((v, j) => (j === qi ? { ...v, options: v.options.map((ov, k) => (k === oi ? e.target.value : ov)) } : v)))}
                        placeholder={`Alternativa ${String.fromCharCode(65 + oi)}`}
                        aria-label={`Alternativa ${String.fromCharCode(65 + oi)} da pergunta ${qi + 1}`}
                        className={cn("h-9", q.answer === oi && "border-success")}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={() => setQuestions((x) => [...x, emptyQuestion()])}>
              <Plus /> Adicionar pergunta
            </Button>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Publicar desafio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function TeacherChallengesPage() {
  const { data, isLoading, error, refetch } = useRepoQuery(["challenges"], (r) => r.listChallenges())
  const [creating, setCreating] = useState(false)
  return (
    <>
      <PageHeader
        title="Desafios"
        description="Crie desafios para engajar as turmas. Você vê apenas dados agregados de participação."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus /> Novo desafio
          </Button>
        }
      />
      <p className="mb-5 flex items-start gap-2 rounded-xl bg-success-50 p-3.5 text-sm text-success">
        <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span className="text-navy">
          Gamificação inclusiva: não há ranking público. Os alunos ganham pontos por participar, podem refazer as atividades e o resultado individual fica privado.
        </span>
      </p>
      {isLoading ? (
        <GridSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon={Trophy} title="Nenhum desafio" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => {
            const meta = categoryMeta[c.category]
            const rate = c.participants ? Math.round((c.completed / c.participants) * 100) : 0
            return (
              <li key={c.id} className="flex flex-col rounded-xl bg-card p-5 ring-1 ring-foreground/[0.06]">
                <div className="flex items-start justify-between">
                  <span className={cn("grid size-11 place-items-center rounded-xl", meta.cls)}>
                    <meta.Icon className="size-6" aria-hidden />
                  </span>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", c.isOpen ? "bg-success-50 text-success" : "bg-muted text-muted-foreground")}>
                    {c.isOpen ? "Aberto" : "Encerrado"}
                  </span>
                </div>
                <p className="mt-3 text-xs font-semibold text-muted-foreground">
                  {meta.label} · {c.className ?? "Toda a escola"}
                </p>
                <h3 className="font-semibold text-navy">{c.title}</h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
                <div className="mt-auto pt-4">
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <Users className="size-3.5" aria-hidden /> {c.participants} participando
                    </span>
                    <span className="font-semibold text-navy">{rate}% concluíram</span>
                  </div>
                  <Progress value={rate} className="h-2" aria-label={`${rate}% concluíram`} />
                  <p className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Star className="size-3 fill-reward text-reward" aria-hidden /> {c.points} pontos
                    </span>
                    <span>até {fmtDate(c.endsAt)}</span>
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {creating && <ChallengeForm onClose={() => setCreating(false)} />}
    </>
  )
}
