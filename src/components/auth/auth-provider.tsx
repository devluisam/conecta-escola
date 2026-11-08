"use client"

import { useQueryClient } from "@tanstack/react-query"
import { usePathname, useRouter } from "next/navigation"
import { createContext, useCallback, useContext, useEffect, useMemo } from "react"
import { getRepository } from "@/lib/data"
import { useRepoQuery } from "@/lib/queries"
import type { Role, User } from "@/lib/types"

interface AuthState {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export const homeFor = (role: Role) => `/${role}`

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const qc = useQueryClient()
  const { data, isLoading } = useRepoQuery(["me"], (r) => r.getCurrentUser())

  const signOut = useCallback(async () => {
    await getRepository().signOut()
    qc.clear()
    // Navegação completa: descarta o estado guardado das telas (inclusive o formulário de login) e o cache do roteador.
    window.location.replace("/login")
  }, [qc])

  const value = useMemo(() => ({ user: data ?? null, loading: isLoading, signOut }), [data, isLoading, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>.")
  return ctx
}

/** Usuário garantido — use apenas dentro de <RoleGate>. */
export function useUser(): User {
  const { user } = useAuth()
  if (!user) throw new Error("Usuário não autenticado.")
  return user
}

/**
 * Segunda barreira (a primeira é o proxy no servidor): impede renderizar a área
 * de outro perfil e manda o usuário para o painel correto.
 */
export function RoleGate({ role, children, fallback }: { role: Role; children: React.ReactNode; fallback: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  useEffect(() => {
    if (loading) return
    if (!user) router.replace(`/login?next=${encodeURIComponent(pathname)}`)
    else if (user.role !== role) router.replace(homeFor(user.role))
  }, [user, loading, role, router, pathname])
  if (loading || !user || user.role !== role) return <>{fallback}</>
  return <>{children}</>
}
