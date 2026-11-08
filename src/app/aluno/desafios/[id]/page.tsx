"use client"

import { ArrowLeft, Check, CheckCircle2, Loader2, PartyPopper, RotateCcw, Star, X } from "lucide-react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useState } from "react"
import { categoryMeta } from "@/components/features/challenges/challenge-meta"
import { Panel } from "@/components/shared/panel"
import { ErrorState, PageSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import type { ChallengeView } from "@/lib/data/repository"
import { fmtDate } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

function Checklist({ c }: { c: ChallengeView }) {
  const toggle = useRepoMutation((r, step: number) => r.toggleChallengeStep(c.id, step), {
    success: (p) => (p.status === "concluido" ? `Desafio concluído! +${c.points} pontos 🎉` : ""),
  })
  const done = c.participation?.completedSteps ?? []
  const finished = c.participation?.status === "concluido"
  const pct = finished ? 100 : Math.round((done.length / (c.steps?.length || 1)) * 100)
  return (
    <Panel title="Etapas do desafio">
      <div className="mb-4">
        <div className="mb-1.5 flex justify-between text-sm">
          <span className="text-muted-foreground">
            {done.length} de {c.steps?.length} etapas
          </span>
          <span className="font-semibold text-navy">{pct}%</span>
        </div>
        <Progress value={pct} className="h-2.5" aria-label={`Progresso ${pct}%`} />
      </div>
      <ul className="space-y-2">
        {c.steps?.map((step, i) => {
          const checked = done.includes(i)
          return (
            <li key={i}>
              <button
                role="checkbox"
                aria-checked={checked}
                disabled={!c.isOpen || finished || toggle.isPending}
                onClick={() => toggle.mutate(i)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border p-3.5 text-left transition-all disabled:cursor-default",
                  checked ? "border-success/30 bg-success-50" : "bg-white hover:border-brand/40",
                )}
              >
                <span className={cn("grid size-6 shrink-0 place-items-center rounded-md border-2 transition-colors", checked ? "border-success bg-success text-white" : "border-input")}>
                  {checked && <Check className="size-4" strokeWidth={3} aria-hidden />}
                </span>
                <span className={cn("text-[15px]", checked ? "text-navy" : "text-foreground/85")}>{step}</span>
              </button>
            </li>
          )
        })}
      </ul>
      {finished && (
        <p className="mt-4 flex items-center gap-2 rounded-lg bg-reward-50 p-3 text-sm font-medium text-reward-700">
          <PartyPopper className="size-5" aria-hidden /> Parabéns! Você concluiu este desafio e ganhou {c.participation?.pointsAwarded} pontos.
        </p>
      )}
      {!c.isOpen && !finished && <p className="mt-4 text-sm text-muted-foreground">Este desafio foi encerrado.</p>}
    </Panel>
  )
}

function Quiz({ c }: { c: ChallengeView }) {
  const questions = c.questions ?? []
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null))
  const [index, setIndex] = useState(0)
  const [result, setResult] = useState<{ correct: number; total: number; pointsAwarded: number; answerKey?: number[] } | null>(null)
  const submit = useRepoMutation((r, a: number[]) => r.submitQuiz(c.id, a), { silent: true, onSuccess: setResult })

  if (!c.isOpen && !result)
    return (
      <Panel>
        <p className="text-sm text-muted-foreground">
          Quiz encerrado.{" "}
          {c.participation?.bestScore != null && `Seu melhor resultado: ${Math.round(c.participation.bestScore * 100)}% de acertos.`}
        </p>
      </Panel>
    )

  if (result)
    return (
      <Panel>
        <div className="text-center">
          <span className="mx-auto grid size-20 place-items-center rounded-full bg-reward-50 text-reward-700">
            <Star className="size-10 fill-reward text-reward" aria-hidden />
          </span>
          <h2 className="mt-3 text-xl font-bold text-navy" role="status">
            Você acertou {result.correct} de {result.total}!
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.pointsAwarded > 0
              ? `+${result.pointsAwarded} pontos por concluir o quiz.`
              : "Os pontos deste quiz já foram registrados — refaça para treinar quanto quiser."}{" "}
            Seu resultado é visível só para você e seu professor.
          </p>
        </div>
        <ol className="mt-5 space-y-3">
          {questions.map((q, i) => {
            const key = result.answerKey?.[i] ?? q.answer
            const ok = answers[i] === key
            return (
              <li key={i} className={cn("rounded-xl border p-3.5", ok ? "border-success/30 bg-success-50/60" : "border-amber-200 bg-amber-50/60")}>
                <p className="flex items-start gap-2 text-sm font-semibold text-navy">
                  {ok ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-label="Correta" /> : <X className="mt-0.5 size-4 shrink-0 text-amber-700" aria-label="Revisar" />}
                  {q.prompt}
                </p>
                <p className="mt-1 pl-6 text-sm text-muted-foreground">
                  Resposta: <strong className="text-navy">{q.options[key]}</strong>
                  {q.explanation && ` — ${q.explanation}`}
                </p>
              </li>
            )
          })}
        </ol>
        <Button
          variant="outline"
          className="mt-5"
          onClick={() => {
            setResult(null)
            setAnswers(questions.map(() => null))
            setIndex(0)
          }}
        >
          <RotateCcw /> Refazer quiz
        </Button>
      </Panel>
    )

  const q = questions[index]
  const last = index === questions.length - 1
  return (
    <Panel>
      <div className="mb-4 flex items-center justify-between text-sm">
        <span className="font-semibold text-navy">
          Pergunta {index + 1} de {questions.length}
        </span>
        <span className="text-muted-foreground">{answers.filter((a) => a != null).length} respondidas</span>
      </div>
      <Progress value={((index + 1) / questions.length) * 100} className="mb-5 h-1.5" aria-hidden />
      <fieldset>
        <legend className="mb-4 text-lg font-semibold text-navy">{q.prompt}</legend>
        <div className="grid gap-2.5" role="radiogroup">
          {q.options.map((opt, oi) => {
            const selected = answers[index] === oi
            return (
              <button
                key={oi}
                role="radio"
                aria-checked={selected}
                onClick={() => setAnswers((a) => a.map((v, i) => (i === index ? oi : v)))}
                className={cn(
                  "flex items-center gap-3 rounded-xl border-2 p-3.5 text-left text-[15px] transition-all",
                  selected ? "border-brand bg-brand-50 text-navy" : "border-transparent bg-surface hover:border-brand/30",
                )}
              >
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full text-sm font-bold", selected ? "bg-brand text-white" : "bg-white text-muted-foreground")}>
                  {String.fromCharCode(65 + oi)}
                </span>
                {opt}
              </button>
            )
          })}
        </div>
      </fieldset>
      <div className="mt-6 flex justify-between gap-2">
        <Button variant="ghost" disabled={index === 0} onClick={() => setIndex((i) => i - 1)}>
          Anterior
        </Button>
        {last ? (
          <Button disabled={answers.some((a) => a == null) || submit.isPending} onClick={() => submit.mutate(answers as number[])}>
            {submit.isPending && <Loader2 className="animate-spin" />} Enviar respostas
          </Button>
        ) : (
          <Button disabled={answers[index] == null} onClick={() => setIndex((i) => i + 1)}>
            Próxima
          </Button>
        )}
      </div>
    </Panel>
  )
}

export default function StudentChallengeDetail() {
  const { id } = useParams<{ id: string }>()
  const { data: c, isLoading, error, refetch } = useRepoQuery(["challenge", id], (r) => r.getChallenge(id))
  if (isLoading) return <PageSkeleton />
  if (error || !c) return <ErrorState error={error} onRetry={refetch} />
  const meta = categoryMeta[c.category]

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link href="/aluno/desafios" className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
        <ArrowLeft className="size-4" /> Desafios
      </Link>
      <div className="rounded-2xl p-6 text-white" style={{ background: `linear-gradient(125deg, ${meta.color}, #071D3A)` }}>
        <div className="flex items-start justify-between gap-3">
          <span className="grid size-12 place-items-center rounded-xl bg-white/15">
            <meta.Icon className="size-7" aria-hidden />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1 text-sm font-bold">
            <Star className="size-4 fill-reward text-reward" aria-hidden /> {c.points} pontos
          </span>
        </div>
        <p className="mt-4 text-xs font-semibold tracking-wide uppercase opacity-80">
          {meta.label}
          {c.subject && ` · ${c.subject.name}`}
        </p>
        <h1 className="text-2xl font-bold">{c.title}</h1>
        <p className="mt-2 max-w-xl text-[15px] opacity-90">{c.description}</p>
        <p className="mt-3 text-xs opacity-75">
          {c.isOpen ? `Disponível até ${fmtDate(c.endsAt)}` : "Encerrado"} · {c.participants} participante(s)
        </p>
      </div>
      {c.kind === "quiz" ? <Quiz c={c} /> : <Checklist c={c} />}
    </div>
  )
}
