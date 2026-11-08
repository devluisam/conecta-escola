"use client"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { useState } from "react"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { AppError } from "@/lib/data/repository"

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: (count, err) => !(err instanceof AppError) && count < 2,
          },
        },
      }),
  )
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider delayDuration={300}>
        {children}
        <Toaster position="top-right" richColors closeButton containerAriaLabel="Notificações" toastOptions={{ closeButtonAriaLabel: "Fechar aviso" }} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}
