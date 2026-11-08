import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { APP_MODE, DEMO_SESSION_COOKIE, supabaseConfig } from "@/lib/config"
import type { Role } from "@/lib/types"

const ROLES: Role[] = ["aluno", "professor", "admin"]

/**
 * Primeira barreira de acesso: redireciona por perfil antes de renderizar.
 * - Produção (Supabase): a sessão é validada no Supabase Auth e o perfil vem
 *   de app_metadata.role (só pode ser alterado com a service role).
 * - Demo: lê o cookie de sessão de demonstração. Esse cookie é IGNORADO em
 *   produção, então não serve para contornar a autenticação real.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl
  let response = NextResponse.next({ request })
  let role: Role | null = null

  if (APP_MODE === "demo") {
    const raw = request.cookies.get(DEMO_SESSION_COOKIE)?.value
    const candidate = raw ? decodeURIComponent(raw).split(".")[1] : null
    role = ROLES.includes(candidate as Role) ? (candidate as Role) : null
  } else {
    const supabase = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value }) => request.cookies.set(name, value))
          response = NextResponse.next({ request })
          cookies.forEach(({ name, value, options }) => response.cookies.set(name, value, options))
        },
      },
    })
    const { data } = await supabase.auth.getUser()
    const candidate = data.user?.app_metadata?.role
    role = ROLES.includes(candidate) ? candidate : null
  }

  const redirect = (to: string) => {
    const res = NextResponse.redirect(new URL(to, request.url))
    response.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }

  if (pathname === "/") return redirect(role ? `/${role}` : "/login")
  if (pathname === "/login") return role ? redirect(`/${role}`) : response

  const area = pathname.split("/")[1] as Role
  if (ROLES.includes(area)) {
    if (!role) return redirect(`/login?next=${encodeURIComponent(pathname + search)}`)
    if (role !== area) return redirect(`/${role}`)
  }
  return response
}

export const config = {
  matcher: ["/", "/login", "/aluno/:path*", "/professor/:path*", "/admin/:path*"],
}
