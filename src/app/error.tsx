"use client"

import { AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="grid min-h-[60dvh] place-items-center px-5">
      <div className="max-w-sm text-center">
        <AlertTriangle className="mx-auto size-10 text-destructive" />
        <h1 className="mt-4 text-xl font-bold text-navy">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message || "Ocorreu um erro inesperado."}</p>
        <Button className="mt-5" onClick={reset}>
          Tentar novamente
        </Button>
      </div>
    </div>
  )
}
