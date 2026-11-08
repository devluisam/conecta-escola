"use client"

import { AuthProvider, RoleGate } from "@/components/auth/auth-provider"
import { LogoMark } from "@/components/brand/logo"
import type { Role } from "@/lib/types"
import { AppShell } from "./app-shell"

function FullPageLoader() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface" aria-busy="true">
      <div className="flex flex-col items-center gap-3 text-muted-foreground">
        <LogoMark className="size-14 animate-pulse" />
        <p className="text-sm">Carregando seu painel…</p>
      </div>
    </div>
  )
}

export function RoleArea({ role, children }: { role: Role; children: React.ReactNode }) {
  return (
    <AuthProvider>
      <RoleGate role={role} fallback={<FullPageLoader />}>
        <AppShell>{children}</AppShell>
      </RoleGate>
    </AuthProvider>
  )
}
