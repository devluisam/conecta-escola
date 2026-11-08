import { CalendarDays, ClipboardCheck, FlaskConical, PartyPopper, PenLine, Sun } from "lucide-react"
import Link from "next/link"
import type { EventType } from "@/lib/types"
import { cn } from "@/lib/utils"

export function Panel({
  title,
  action,
  children,
  className,
  bodyClassName,
}: {
  title?: React.ReactNode
  action?: { label: string; href: string }
  children: React.ReactNode
  className?: string
  bodyClassName?: string
}) {
  return (
    <section className={cn("flex min-w-0 flex-col rounded-xl bg-card ring-1 ring-foreground/[0.06] shadow-[0_1px_2px_rgba(7,29,58,0.04)]", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 px-5 pt-4 pb-2">
          <h2 className="text-[15px] font-semibold text-navy">{title}</h2>
          {action && (
            <Link href={action.href} className="shrink-0 text-[13px] font-semibold text-brand underline-offset-2 hover:underline">
              {action.label}
            </Link>
          )}
        </header>
      )}
      <div className={cn("flex-1 px-5 pb-5", !title && "pt-5", bodyClassName)}>{children}</div>
    </section>
  )
}

const eventStyle: Record<EventType, { Icon: typeof CalendarDays; cls: string }> = {
  prova: { Icon: PenLine, cls: "bg-red-50 text-red-600" },
  trabalho: { Icon: ClipboardCheck, cls: "bg-brand-50 text-brand" },
  aula: { Icon: FlaskConical, cls: "bg-success-50 text-success" },
  evento: { Icon: PartyPopper, cls: "bg-violet-50 text-violet" },
  feriado: { Icon: Sun, cls: "bg-reward-50 text-reward-700" },
}

export function EventIcon({ type, className }: { type: EventType; className?: string }) {
  const { Icon, cls } = eventStyle[type]
  return (
    <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg", cls, className)} aria-hidden>
      <Icon className="size-5" />
    </span>
  )
}

export const eventDotColor: Record<EventType, string> = {
  prova: "#DC2626",
  trabalho: "#1877D2",
  aula: "#22A06B",
  evento: "#7C4DDB",
  feriado: "#F5B942",
}
