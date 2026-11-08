import { CheckCircle2, Clock, AlertCircle, Send } from "lucide-react"
import type { PublicUser } from "@/lib/data/repository"
import { initials, taskStatusLabel } from "@/lib/format"
import type { StudentTaskStatus, Subject } from "@/lib/types"
import { cn } from "@/lib/utils"

const statusStyles: Record<StudentTaskStatus, { cls: string; Icon: typeof Clock }> = {
  pendente: { cls: "bg-brand-50 text-brand-600", Icon: Clock },
  atrasada: { cls: "bg-red-50 text-red-700", Icon: AlertCircle },
  entregue: { cls: "bg-amber-50 text-amber-800", Icon: Send },
  corrigida: { cls: "bg-success-50 text-success", Icon: CheckCircle2 },
}

export function TaskStatusBadge({ status, className }: { status: StudentTaskStatus; className?: string }) {
  const { cls, Icon } = statusStyles[status]
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold", cls, className)}>
      <Icon className="size-3.5" aria-hidden />
      {taskStatusLabel[status]}
    </span>
  )
}

export function SubjectTag({ subject, className }: { subject: Pick<Subject, "name" | "color">; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold", className)}
      style={{ backgroundColor: `${subject.color}14`, color: subject.color }}
    >
      <span className="size-1.5 rounded-full" style={{ backgroundColor: subject.color }} aria-hidden />
      {subject.name}
    </span>
  )
}

export function UserAvatar({
  user,
  size = "md",
  className,
}: {
  user: Pick<PublicUser, "name" | "avatarColor" | "photoDataUrl">
  size?: "sm" | "md" | "lg" | "xl"
  className?: string
}) {
  const s = { sm: "size-8 text-xs", md: "size-10 text-sm", lg: "size-14 text-lg", xl: "size-24 text-3xl" }[size]
  if (user.photoDataUrl)
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={user.photoDataUrl} alt="" className={cn("shrink-0 rounded-full object-cover", s, className)} />
  return (
    <span
      aria-hidden
      className={cn("grid shrink-0 place-items-center rounded-full font-bold text-white", s, className)}
      style={{ backgroundColor: user.avatarColor }}
    >
      {initials(user.name)}
    </span>
  )
}

export function CountBadge({ count, className }: { count: number; className?: string }) {
  if (!count) return null
  return (
    <span
      className={cn(
        "grid min-w-[18px] place-items-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-[18px] text-white ring-2 ring-white",
        className,
      )}
    >
      {count > 9 ? "9+" : count}
    </span>
  )
}
