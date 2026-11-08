"use client"

import { AlertTriangle, Inbox, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { errorMessage } from "@/lib/queries"
import { cn } from "@/lib/utils"

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed bg-card/60 px-6 py-10 text-center", className)}>
      <span className="mb-3 grid size-12 place-items-center rounded-full bg-brand-50 text-brand">
        <Icon className="size-6" />
      </span>
      <p className="font-semibold text-navy">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-destructive/20 bg-destructive/5 px-6 py-8 text-center">
      <AlertTriangle className="mb-2 size-7 text-destructive" />
      <p className="font-semibold text-navy">Não foi possível carregar</p>
      <p className="mt-1 text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw /> Tentar novamente
        </Button>
      )}
    </div>
  )
}

export function ListSkeleton({ rows = 4, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/5">
          <Skeleton className="size-10 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3.5 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function GridSkeleton({ items = 6, className }: { items?: number; className?: string }) {
  return (
    <div className={cn("grid gap-4 sm:grid-cols-2 xl:grid-cols-3", className)} aria-busy="true" aria-label="Carregando">
      {Array.from({ length: items }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Carregando página">
      <Skeleton className="h-8 w-64" />
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-64 rounded-xl" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    </div>
  )
}
