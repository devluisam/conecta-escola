"use client"

import { ArrowRight, CheckCircle2, Clock, HeartHandshake, Star, Trophy, Users } from "lucide-react"
import Link from "next/link"
import { BadgeMedal, categoryMeta } from "@/components/features/challenges/challenge-meta"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/shared/states"
import { Progress } from "@/components/ui/progress"
import type { ChallengeView } from "@/lib/data/repository"
import { fmtDate, fmtRelative } from "@/lib/format"
import { useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"

function progressOf(c: ChallengeView) {
  if (!c.participation) return 0
  if (c.participation.status === "concluido") return 100
  return c.kind === "checklist" ? Math.round((c.participation.completedSteps.length / (c.steps?.length || 1)) * 100) : 0
}

function ChallengeCard({ c }: { c: ChallengeView }) {
  const meta = categoryMeta[c.category]
  const p = progressOf(c)
  const done = c.participation?.status === "concluido"
  return (
    <Link
      href={`/aluno/desafios/${c.id}`}
      className={cn(
        "group flex h-full flex-col rounded-xl bg-card p-5 ring-1 ring-foreground/[0.06] transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_30px_-16px_rgba(7,29,58,0.35)]",
        c.featured && c.isOpen && "ring-2 ring-violet/40",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={cn("grid size-11 place-items-center rounded-xl", meta.cls)}>
          <meta.Icon className="size-6" aria-hidden />
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-reward-50 px-2.5 py-1 text-xs font-bold text-reward-700">
          <Star className="size-3.5 fill-reward text-reward" aria-hidden /> {c.points} pts
        </span>
      </div>
      <p className="mt-3 text-xs font-semibold text-muted-foreground">
        {meta.label}
        {c.featured && c.isOpen && <span className="ml-2 rounded-full bg-violet-50 px-2 py-0.5 text-violet">Destaque</span>}
      </p>
      <h3 className="mt-0.5 font-semibold text-navy group-hover:text-brand">{c.title}</h3>
      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
      <div className="mt-auto pt-4">
        {done ? (
          <p className="flex items-center gap-1.5 text-sm font-semibold text-success">
            <CheckCircle2 className="size-4" aria-hidden /> Concluído · +{c.participation?.pointsAwarded} pts
          </p>
        ) : c.participation ? (
          <>
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>{c.kind === "quiz" ? `${c.participation.attempts} tentativa(s)` : "Seu progresso"}</span>
              {c.kind === "checklist" && <span className="font-semibold text-navy">{p}%</span>}
            </div>
            <Progress value={p} className="h-2" aria-label={`Progresso: ${p}%`} />
          </>
        ) : (
          <p className="flex items-center gap-1 text-sm font-semibold text-brand">
            Participar <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </p>
        )}
        <p className="mt-2 flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="size-3" aria-hidden /> {c.isOpen ? `Até ${fmtDate(c.endsAt, "dd/MM")}` : "Encerrado"}
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="size-3" aria-hidden /> {c.participants} participando
          </span>
        </p>
      </div>
    </Link>
  )
}

export default function StudentChallengesPage() {
  const challenges = useRepoQuery(["challenges"], (r) => r.listChallenges())
  const points = useRepoQuery(["points"], (r) => r.getPointsSummary())

  const open = (challenges.data ?? []).filter((c) => c.isOpen)
  const history = (challenges.data ?? []).filter((c) => !c.isOpen && c.participation)
  const goal = points.data?.classGoal

  return (
    <>
      <PageHeader title="Desafios" description="Aprenda no seu ritmo, participe e ganhe pontos e medalhas." />
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0 space-y-6">
          <section aria-labelledby="abertos">
            <h2 id="abertos" className="mb-3 text-[15px] font-semibold text-navy">
              Desafios abertos ({open.length})
            </h2>
            {challenges.isLoading ? (
              <GridSkeleton items={4} className="xl:grid-cols-2" />
            ) : challenges.error ? (
              <ErrorState error={challenges.error} onRetry={challenges.refetch} />
            ) : open.length === 0 ? (
              <EmptyState icon={Trophy} title="Nenhum desafio aberto" description="Novos desafios aparecem aqui assim que forem publicados." />
            ) : (
              <ul className="grid gap-4 sm:grid-cols-2">
                {open.map((c) => (
                  <li key={c.id}>
                    <ChallengeCard c={c} />
                  </li>
                ))}
              </ul>
            )}
          </section>
          {history.length > 0 && (
            <section aria-labelledby="historico">
              <h2 id="historico" className="mb-3 text-[15px] font-semibold text-navy">
                Histórico de participação
              </h2>
              <ul className="grid gap-4 sm:grid-cols-2">
                {history.map((c) => (
                  <li key={c.id}>
                    <ChallengeCard c={c} />
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <aside id="pontos" className="min-w-0 scroll-mt-24 space-y-4">
          <div className="relative overflow-hidden rounded-xl bg-navy p-5 text-white">
            <div className="pointer-events-none absolute -top-10 -right-10 size-36 rounded-full border-[14px] border-reward/20" aria-hidden />
            <p className="text-sm text-white/75">Seus pontos</p>
            <p className="mt-1 flex items-center gap-2 text-4xl font-bold tabular-nums">
              <Star className="size-8 fill-reward text-reward" aria-hidden /> {points.data?.total ?? "—"}
            </p>
            <p className="mt-2 text-xs text-white/70">Pontos são ganhos por participar e concluir — errar faz parte do aprendizado.</p>
          </div>

          {goal?.enabled && (
            <Panel title="Meta coletiva da turma">
              <p className="flex items-center gap-2 text-sm text-muted-foreground">
                <HeartHandshake className="size-4 text-success" aria-hidden /> {goal.className} rumo a {goal.goal.toLocaleString("pt-BR")} pontos
              </p>
              <Progress value={Math.min(100, (goal.current / goal.goal) * 100)} className="mt-3 h-2.5" aria-label="Progresso da turma" />
              <p className="mt-1.5 text-xs text-muted-foreground">
                <strong className="text-navy">{goal.current.toLocaleString("pt-BR")}</strong> pontos somados por toda a turma. Cada participação conta!
              </p>
            </Panel>
          )}

          <Panel title="Medalhas">
            <ul className="grid grid-cols-2 gap-2.5">{points.data?.badges.map((b) => <BadgeMedal key={b.id} badge={b} />)}</ul>
          </Panel>

          <Panel title="Extrato de pontos">
            <ul className="divide-y">
              {(points.data?.entries ?? []).slice(0, 8).map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate text-sm text-navy">{e.reason}</span>
                    <span className="text-[11px] text-muted-foreground">{fmtRelative(e.createdAt)}</span>
                  </span>
                  <span className="shrink-0 text-sm font-bold text-reward-700">+{e.points}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </aside>
      </div>
    </>
  )
}
