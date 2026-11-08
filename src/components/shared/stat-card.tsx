import Link from "next/link"
import { cn } from "@/lib/utils"

const tones = {
  brand: { text: "text-brand", icon: "text-brand bg-brand-50" },
  success: { text: "text-success", icon: "text-success bg-success-50" },
  violet: { text: "text-violet", icon: "text-violet bg-violet-50" },
  reward: { text: "text-reward-700", icon: "text-reward bg-reward-50" },
  navy: { text: "text-navy", icon: "text-navy bg-muted" },
} as const

export type Tone = keyof typeof tones

export function StatCard({
  label,
  value,
  icon: Icon,
  tone = "brand",
  href,
  hint,
}: {
  label: string
  value: React.ReactNode
  icon: React.ComponentType<{ className?: string }>
  tone?: Tone
  href?: string
  hint?: string
}) {
  const t = tones[tone]
  const body = (
    <>
      <div className="min-w-0">
        <p className={cn("text-[13px] leading-tight font-semibold sm:truncate", t.text)}>{label}</p>
        <p className="mt-1.5 text-[28px] font-bold leading-none tracking-tight text-navy tabular-nums">{value}</p>
        {hint && <p className="mt-1.5 hidden truncate text-xs text-muted-foreground sm:block">{hint}</p>}
      </div>
      <span className={cn("grid size-9 shrink-0 place-items-center self-start rounded-xl transition-transform group-hover:scale-105 sm:size-11 sm:self-center", t.icon)}>
        <Icon className="size-5 sm:size-[22px]" />
      </span>
    </>
  )
  const cls =
    "group flex min-w-0 items-center justify-between gap-2 rounded-xl bg-card p-3.5 sm:gap-3 sm:p-4 ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgba(7,29,58,0.04)] transition-all"
  if (!href) return <div className={cls}>{body}</div>
  return (
    <Link
      href={href}
      className={cn(cls, "hover:-translate-y-0.5 hover:shadow-[0_8px_24px_-12px_rgba(7,29,58,0.25)] focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none")}
    >
      {body}
    </Link>
  )
}
