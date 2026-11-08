import { BookOpen, Brain, Flame, FlaskConical, Leaf, Sprout, Star, Target, type LucideIcon } from "lucide-react"
import type { Badge } from "@/lib/data/repository"
import type { ChallengeCategory } from "@/lib/types"
import { cn } from "@/lib/utils"

export const categoryMeta: Record<ChallengeCategory, { label: string; Icon: LucideIcon; cls: string; color: string }> = {
  leitura: { label: "Leitura", Icon: BookOpen, cls: "bg-violet-50 text-violet", color: "#7C4DDB" },
  quiz: { label: "Quiz", Icon: Brain, cls: "bg-brand-50 text-brand", color: "#1877D2" },
  sustentabilidade: { label: "Sustentabilidade", Icon: Leaf, cls: "bg-success-50 text-success", color: "#22A06B" },
  ciencias: { label: "Ciências", Icon: FlaskConical, cls: "bg-[#E6F6F7] text-[#0E9AA7]", color: "#0E9AA7" },
  meta: { label: "Meta semanal", Icon: Target, cls: "bg-reward-50 text-reward-700", color: "#F5B942" },
}

const badgeIcon: Record<Badge["icon"], LucideIcon> = { sprout: Sprout, book: BookOpen, brain: Brain, flask: FlaskConical, flame: Flame, star: Star }

export function BadgeMedal({ badge }: { badge: Badge }) {
  const Icon = badgeIcon[badge.icon]
  return (
    <li className={cn("flex flex-col items-center rounded-xl p-3 text-center transition-colors", badge.earned ? "bg-reward-50" : "bg-muted/60")}>
      <span
        className={cn(
          "grid size-14 place-items-center rounded-full ring-4",
          badge.earned ? "bg-gradient-to-br from-[#FFD978] to-reward text-navy ring-reward/25" : "bg-white text-muted-foreground/50 ring-muted",
        )}
        aria-hidden
      >
        <Icon className="size-6" />
      </span>
      <p className={cn("mt-2 text-xs font-semibold", badge.earned ? "text-navy" : "text-muted-foreground")}>{badge.name}</p>
      <p className="mt-0.5 text-[11px] leading-tight text-muted-foreground">{badge.description}</p>
      <span className="sr-only">{badge.earned ? "Conquistada" : "Ainda não conquistada"}</span>
    </li>
  )
}
