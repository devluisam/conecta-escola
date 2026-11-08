import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

/** Rótulo + campo + mensagem de erro, com ids ligados para leitores de tela. */
export function FormField({
  id,
  label,
  error,
  hint,
  children,
  className,
  required,
}: {
  id: string
  label: string
  error?: string
  hint?: string
  children: React.ReactNode
  className?: string
  required?: boolean
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={id} className="text-navy">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
