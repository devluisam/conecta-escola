"use client"

import { FileText, Paperclip, X } from "lucide-react"
import { useId, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { ACCEPTED_FILES, readFileAsRef } from "@/lib/files"
import { fmtBytes } from "@/lib/format"
import type { FileRef } from "@/lib/types"

export function FilePicker({
  value,
  onChange,
  maxMb = 2,
  label = "Anexar arquivo",
  accept = ACCEPTED_FILES,
}: {
  value: FileRef | null | undefined
  onChange: (file: FileRef | null) => void
  maxMb?: number
  label?: string
  accept?: string
}) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (value)
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-surface px-3 py-2.5">
        <FileText className="size-5 shrink-0 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-navy">{value.name}</p>
          <p className="text-xs text-muted-foreground">{fmtBytes(value.size)}</p>
        </div>
        <Button type="button" variant="ghost" size="icon-sm" onClick={() => onChange(null)} aria-label={`Remover ${value.name}`}>
          <X />
        </Button>
      </div>
    )

  return (
    <div>
      <input
        ref={input}
        id={id}
        type="file"
        accept={accept}
        className="sr-only"
        onChange={async (e) => {
          const file = e.target.files?.[0]
          e.target.value = ""
          if (!file) return
          setError(null)
          setLoading(true)
          try {
            onChange(await readFileAsRef(file, maxMb))
          } catch (err) {
            setError(err instanceof Error ? err.message : "Arquivo inválido.")
          } finally {
            setLoading(false)
          }
        }}
      />
      <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={loading}>
        <Paperclip /> {loading ? "Lendo arquivo…" : label}
      </Button>
      <p className="mt-1.5 text-xs text-muted-foreground">PDF, documentos ou imagens · até {maxMb} MB</p>
      {error && (
        <p role="alert" className="mt-1 text-[13px] text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
