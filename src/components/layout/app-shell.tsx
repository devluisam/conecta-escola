"use client"

import { Bell, ChevronDown, LogOut, Mail, Menu, RotateCcw, UserRound, CheckCheck, FlaskConical } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "sonner"
import { useAuth, useUser } from "@/components/auth/auth-provider"
import { Logo } from "@/components/brand/logo"
import { CountBadge, UserAvatar } from "@/components/shared/badges"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { IS_DEMO } from "@/lib/config"
import { getRepository } from "@/lib/data"
import { firstName, fmtRelative, roleLabel } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { Role } from "@/lib/types"
import { cn } from "@/lib/utils"
import { isActive, NAV, type NavItem } from "./nav-config"

function useUnreadMessages() {
  const { data } = useRepoQuery(["conversations"], (r) => r.listConversations())
  return data?.reduce((s, c) => s + c.unread, 0) ?? 0
}

function NavLinks({ role, onNavigate }: { role: Role; onNavigate?: () => void }) {
  const pathname = usePathname()
  const unread = useUnreadMessages()
  const { signOut } = useAuth()
  return (
    <nav aria-label="Menu principal" className="flex flex-1 flex-col gap-1 px-3 py-4">
      {NAV[role].items.map((item: NavItem) => {
        const active = isActive(pathname, item.href, role)
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none",
              active ? "bg-sidebar-primary text-white shadow-[0_6px_16px_-8px_rgba(24,119,210,0.9)]" : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white",
            )}
          >
            <item.icon className="size-[19px] shrink-0" aria-hidden />
            <span className="flex-1">{item.label}</span>
            {item.badge === "messages" && unread > 0 && (
              <span className="rounded-full bg-reward px-1.5 text-[11px] font-bold text-navy" aria-label={`${unread} não lidas`}>
                {unread}
              </span>
            )}
          </Link>
        )
      })}
      <div className="mt-auto border-t border-sidebar-border pt-3">
        <button
          onClick={() => {
            onNavigate?.()
            signOut()
          }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[14px] font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-white focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:outline-none"
        >
          <LogOut className="size-[19px]" aria-hidden /> Sair
        </button>
      </div>
    </nav>
  )
}

function NotificationsButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const { data = [] } = useRepoQuery(["notifications"], (r) => r.listNotifications())
  const unread = data.filter((n) => !n.read).length
  const markAll = useRepoMutation((r) => r.markAllNotificationsRead(), { silent: true })
  const markOne = useRepoMutation((r, id: string) => r.markNotificationRead(id), { silent: true })
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon-lg" className="relative rounded-full" aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}>
          <Bell className="size-[21px] text-navy" />
          <CountBadge count={unread} className="absolute -top-0.5 -right-0.5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,360px)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="font-semibold text-navy">Notificações</p>
          {unread > 0 && (
            <Button variant="ghost" size="xs" onClick={() => markAll.mutate(undefined)}>
              <CheckCheck /> Marcar todas como lidas
            </Button>
          )}
        </div>
        <ul className="max-h-[60vh] overflow-y-auto py-1">
          {data.length === 0 && <li className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhuma notificação por aqui.</li>}
          {data.map((n) => (
            <li key={n.id}>
              <button
                className={cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-muted", !n.read && "bg-brand-50/60")}
                onClick={() => {
                  if (!n.read) markOne.mutate(n.id)
                  setOpen(false)
                  if (n.href) router.push(n.href)
                }}
              >
                <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-brand")} aria-hidden />
                <span className="min-w-0">
                  <span className="block text-sm font-semibold text-navy">{n.title}</span>
                  <span className="block truncate text-[13px] text-muted-foreground">{n.body}</span>
                  <span className="mt-0.5 block text-xs text-muted-foreground">{fmtRelative(n.createdAt)}</span>
                </span>
                {!n.read && <span className="sr-only">(não lida)</span>}
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}

function UserMenu() {
  const user = useUser()
  const { signOut } = useAuth()
  const reset = async () => {
    await getRepository().resetDemo?.()
    toast.success("Dados de demonstração restaurados.")
    await signOut()
  }
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full p-0.5 pr-1.5 transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none" aria-label="Menu da conta">
          <UserAvatar user={user} size="sm" className="size-9" />
          <span className="hidden text-left leading-tight md:block">
            <span className="block text-sm font-semibold text-navy">{firstName(user.name)}</span>
            <span className="block text-xs text-muted-foreground">{roleLabel[user.role]}</span>
          </span>
          <ChevronDown className="hidden size-4 text-muted-foreground md:block" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate font-semibold text-navy">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href={`/${user.role}/perfil`}>
            <UserRound /> Meu perfil
          </Link>
        </DropdownMenuItem>
        {IS_DEMO && (
          <DropdownMenuItem onSelect={reset}>
            <RotateCcw /> Restaurar dados de demonstração
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={() => signOut()}>
          <LogOut /> Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const unread = useUnreadMessages()
  const items = NAV[role].bottom.map((href) => NAV[role].items.find((i) => i.href === href)!)
  return (
    <nav aria-label="Navegação principal" className="pb-safe fixed inset-x-0 bottom-0 z-40 border-t bg-white/95 backdrop-blur lg:hidden">
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {items.map((item) => {
          const active = isActive(pathname, item.href, role)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-brand" : "text-muted-foreground hover:text-navy",
                )}
              >
                <span className={cn("grid h-7 w-12 place-items-center rounded-full transition-colors", active && "bg-brand-50")}>
                  <item.icon className="size-[21px]" aria-hidden />
                </span>
                {item.short ?? item.label}
                {item.badge === "messages" && <CountBadge count={unread} className="absolute top-1 right-[calc(50%-20px)]" />}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useUser()
  const role = user.role
  const unread = useUnreadMessages()
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-dvh bg-surface">
      <a href="#conteudo" className="sr-only z-50 rounded-md bg-brand px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3">
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 flex h-16 items-center border-b bg-white/95 backdrop-blur">
        <div className="flex h-full items-center px-4 lg:w-64 lg:px-6">
          <Link href={`/${role}`} aria-label="Conecta Escola – início" className="rounded-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none">
            <Logo size="sm" />
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-end gap-1 px-3 sm:gap-2 lg:px-6">
          {IS_DEMO && (
            <span className="mr-auto ml-2 hidden items-center gap-1.5 rounded-full bg-reward-50 px-3 py-1 text-xs font-semibold text-reward-700 sm:inline-flex">
              <FlaskConical className="size-3.5" aria-hidden /> Modo demonstração · dados fictícios
            </span>
          )}
          <NotificationsButton />
          <Button variant="ghost" size="icon-lg" className="relative hidden rounded-full sm:inline-flex" asChild>
            <Link href={`/${role}/comunicacao`} aria-label={`Mensagens${unread ? `, ${unread} não lidas` : ""}`}>
              <Mail className="size-[21px] text-navy" />
              <CountBadge count={unread} className="absolute -top-0.5 -right-0.5" />
            </Link>
          </Button>
          <div className="hidden sm:block">
            <UserMenu />
          </div>
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon-lg" className="rounded-full lg:hidden" aria-label="Abrir menu">
                <Menu className="size-6 text-navy" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[82vw] max-w-xs gap-0 border-0 bg-sidebar p-0 text-sidebar-foreground">
              <SheetHeader className="border-b border-sidebar-border p-5">
                <SheetTitle className="sr-only">Menu</SheetTitle>
                <SheetDescription className="sr-only">Navegue pelos módulos do Conecta Escola</SheetDescription>
                <Logo tone="light" size="sm" />
                <div className="mt-4 flex items-center gap-3">
                  <UserAvatar user={user} size="md" />
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{user.name}</p>
                    <p className="text-xs text-sidebar-foreground">{roleLabel[role]}</p>
                  </div>
                </div>
              </SheetHeader>
              <NavLinks role={role} onNavigate={() => setMenuOpen(false)} />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      <div className="flex min-h-[calc(100dvh-4rem)]">
        <aside className="hidden w-64 shrink-0 bg-sidebar lg:block">
          <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col overflow-y-auto">
            <NavLinks role={role} />
          </div>
        </aside>
        <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-4 pt-6 pb-28 outline-none sm:px-6 lg:px-8 lg:pb-10">
          <div className="mx-auto max-w-[1240px]">{children}</div>
        </main>
      </div>
      <BottomNav role={role} />
    </div>
  )
}
