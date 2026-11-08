"use client"

import { ArrowLeft, Loader2, MessageCirclePlus, MessagesSquare, Search, Send, ShieldCheck } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { useUser } from "@/components/auth/auth-provider"
import { CountBadge, UserAvatar } from "@/components/shared/badges"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { getRepository } from "@/lib/data"
import type { ConversationView } from "@/lib/data/repository"
import { fmtChatTime, fmtDay, fmtTime } from "@/lib/format"
import { errorMessage, useRepoMutation, useRepoQuery } from "@/lib/queries"
import { cn } from "@/lib/utils"
import { AnnouncementsPanel } from "./announcements-panel"
import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

function NewConversationDialog({ open, onOpenChange, onPick }: { open: boolean; onOpenChange: (o: boolean) => void; onPick: (id: string) => void }) {
  const { data, isLoading } = useRepoQuery(["contacts"], (r) => r.listContacts(), { enabled: open })
  const [q, setQ] = useState("")
  const list = (data ?? []).filter((c) => `${c.name} ${c.subtitle}`.toLowerCase().includes(q.toLowerCase()))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy">Nova conversa</DialogTitle>
          <DialogDescription>Você pode conversar apenas com pessoas vinculadas à sua turma ou escola.</DialogDescription>
        </DialogHeader>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar contato" className="pl-9" aria-label="Buscar contato" autoFocus />
        </div>
        <ul className="-mx-2 max-h-80 overflow-y-auto">
          {isLoading && <li className="p-4 text-sm text-muted-foreground">Carregando contatos…</li>}
          {!isLoading && list.length === 0 && <li className="p-4 text-sm text-muted-foreground">Nenhum contato encontrado.</li>}
          {list.map((c) => (
            <li key={c.id}>
              <button onClick={() => onPick(c.id)} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-muted">
                <UserAvatar user={c} size="sm" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-navy">{c.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  )
}

function ChatPanel({ conversation, onBack }: { conversation: ConversationView; onBack: () => void }) {
  const user = useUser()
  const qc = useQueryClient()
  const [text, setText] = useState("")
  const end = useRef<HTMLDivElement>(null)
  const { data, isLoading } = useRepoQuery(["messages", conversation.id], (r) => r.listMessages(conversation.id), { refetchInterval: 8000 })
  const send = useRepoMutation((r, body: string) => r.sendMessage(conversation.id, body), { silent: true, onSuccess: () => setText("") })

  useEffect(() => {
    if (conversation.unread > 0)
      getRepository()
        .markConversationRead(conversation.id)
        .then(() => qc.invalidateQueries({ queryKey: ["conversations"] }))
  }, [conversation.id, conversation.unread, qc])
  useEffect(() => {
    end.current?.scrollIntoView({ block: "end" })
  }, [data?.length])

  const submit = () => {
    const body = text.trim()
    if (!body || send.isPending) return
    send.mutate(body, { onError: (e) => toast.error(errorMessage(e)) })
  }

  let lastDay = ""
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Voltar para conversas">
          <ArrowLeft />
        </Button>
        <UserAvatar user={conversation.other} size="sm" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy">{conversation.other.name}</p>
          <p className="truncate text-xs text-muted-foreground">{conversation.subtitle}</p>
        </div>
      </header>
      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto bg-surface/60 px-4 py-4" role="log" aria-live="polite" aria-label={`Mensagens com ${conversation.other.name}`}>
        {isLoading && <ListSkeleton rows={2} />}
        {data?.length === 0 && <p className="py-10 text-center text-sm text-muted-foreground">Envie a primeira mensagem para {conversation.other.name}.</p>}
        {data?.map((m) => {
          const mine = m.senderId === user.id
          const day = fmtDay(m.createdAt)
          const showDay = day !== lastDay
          lastDay = day
          return (
            <div key={m.id}>
              {showDay && (
                <p className="my-3 text-center">
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-medium text-muted-foreground ring-1 ring-foreground/5">{day}</span>
                </p>
              )}
              <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
                <div className={cn("max-w-[82%] rounded-2xl px-3.5 py-2 text-[15px] shadow-sm", mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-white text-navy")}>
                  <p className="break-words whitespace-pre-line">{m.body}</p>
                  <p className={cn("mt-0.5 text-right text-[10px]", mine ? "text-white/75" : "text-muted-foreground")}>
                    {fmtTime(m.createdAt)}
                    {mine && (m.readAt ? " · lida" : " · enviada")}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={end} />
      </div>
      <form
        className="flex items-end gap-2 border-t bg-white p-3"
        onSubmit={(e) => {
          e.preventDefault()
          submit()
        }}
      >
        <label htmlFor="chat-input" className="sr-only">
          Escreva uma mensagem
        </label>
        <Textarea
          id="chat-input"
          rows={1}
          value={text}
          maxLength={2000}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
          placeholder="Escreva sua mensagem… (Enter envia)"
          className="max-h-32 min-h-10 resize-none"
        />
        <Button type="submit" size="icon-lg" disabled={!text.trim() || send.isPending} aria-label="Enviar mensagem">
          {send.isPending ? <Loader2 className="animate-spin" /> : <Send />}
        </Button>
      </form>
    </div>
  )
}

export function CommunicationView({ canPost = false }: { canPost?: boolean }) {
  const params = useSearchParams()
  const router = useRouter()
  const tab = params.get("aba") === "avisos" ? "avisos" : "mensagens"
  const activeId = params.get("c")
  const para = params.get("para")
  const [picker, setPicker] = useState(false)
  const [q, setQ] = useState("")
  const { data, isLoading, error, refetch } = useRepoQuery(["conversations"], (r) => r.listConversations(), { refetchInterval: 15000 })
  const start = useRepoMutation((r, id: string) => r.startConversation(id), {
    silent: true,
    onSuccess: (c) => {
      setPicker(false)
      go({ c: c.id })
    },
  })

  const go = (next: Record<string, string | null>) => {
    const url = new URL(window.location.href)
    url.searchParams.delete("para")
    for (const [k, v] of Object.entries(next)) {
      if (v) url.searchParams.set(k, v)
      else url.searchParams.delete(k)
    }
    router.replace(url.pathname + url.search, { scroll: false })
  }

  // Atalho "falar com o professor" vindo de outras telas.
  const startedFor = useRef<string | null>(null)
  useEffect(() => {
    if (para && startedFor.current !== para) {
      startedFor.current = para
      start.mutate(para, { onError: (e) => toast.error(errorMessage(e)) })
    }
  }, [para, start])

  const list = useMemo(() => (data ?? []).filter((c) => c.other.name.toLowerCase().includes(q.toLowerCase())), [data, q])
  const active = data?.find((c) => c.id === activeId) ?? null
  const unreadTotal = (data ?? []).reduce((s, c) => s + c.unread, 0)

  return (
    <>
      <PageHeader title="Comunicação" description="Converse com a comunidade escolar e acompanhe os avisos." />
      <Tabs value={tab} onValueChange={(v) => go({ aba: v === "avisos" ? "avisos" : null })}>
        <TabsList className="mb-4 h-10 bg-white ring-1 ring-foreground/[0.06]">
          <TabsTrigger value="mensagens" className="gap-2 px-4">
            Mensagens <CountBadge count={unreadTotal} className="ring-0" />
          </TabsTrigger>
          <TabsTrigger value="avisos" className="px-4">
            Avisos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mensagens">
          <div className="grid h-[calc(100dvh-17rem)] min-h-[440px] overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06] md:grid-cols-[320px_1fr] lg:h-[calc(100dvh-15rem)]">
            <div className={cn("flex min-h-0 flex-col border-r", active && "hidden md:flex")}>
              <div className="flex gap-2 border-b p-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
                  <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar conversa" className="pl-9" aria-label="Buscar conversa" />
                </div>
                <Button size="icon-lg" onClick={() => setPicker(true)} aria-label="Nova conversa">
                  <MessageCirclePlus />
                </Button>
              </div>
              <ul className="min-h-0 flex-1 overflow-y-auto">
                {isLoading && <ListSkeleton rows={3} className="p-3" />}
                {error && (
                  <li className="p-3">
                    <ErrorState error={error} onRetry={refetch} />
                  </li>
                )}
                {!isLoading && list.length === 0 && (
                  <li className="p-4">
                    <EmptyState icon={MessagesSquare} title="Nenhuma conversa" description="Toque em + para tirar uma dúvida com um professor." className="py-6" />
                  </li>
                )}
                {list.map((c) => (
                  <li key={c.id}>
                    <button
                      onClick={() => go({ c: c.id })}
                      aria-current={c.id === activeId ? "true" : undefined}
                      className={cn("flex w-full items-center gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted/60", c.id === activeId && "bg-brand-50")}
                    >
                      <UserAvatar user={c.other} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-baseline justify-between gap-2">
                          <span className={cn("truncate text-sm text-navy", c.unread ? "font-bold" : "font-semibold")}>{c.other.name}</span>
                          {c.lastMessage && <span className="shrink-0 text-[11px] text-muted-foreground">{fmtChatTime(c.lastMessage.createdAt)}</span>}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">{c.subtitle}</span>
                        <span className="mt-0.5 flex items-center justify-between gap-2">
                          <span className={cn("truncate text-[13px]", c.unread ? "font-medium text-navy" : "text-muted-foreground")}>{c.lastMessage?.body ?? "Sem mensagens"}</span>
                          {c.unread > 0 && (
                            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-brand text-[10px] font-bold text-white" aria-label={`${c.unread} não lidas`}>
                              {c.unread}
                            </span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <p className="flex items-center gap-1.5 border-t px-3 py-2 text-[11px] text-muted-foreground">
                <ShieldCheck className="size-3.5 text-success" aria-hidden /> Conversas restritas aos vínculos escolares
              </p>
            </div>
            <div className={cn("min-h-0", !active && "hidden md:block")}>
              {active ? (
                <ChatPanel key={active.id} conversation={active} onBack={() => go({ c: null })} />
              ) : (
                <div className="grid h-full place-items-center p-6">
                  <EmptyState icon={MessagesSquare} title="Selecione uma conversa" description="Escolha uma conversa ao lado ou inicie uma nova." className="border-0 bg-transparent" />
                </div>
              )}
            </div>
          </div>
        </TabsContent>
        <TabsContent value="avisos">
          <AnnouncementsPanel canPost={canPost} />
        </TabsContent>
      </Tabs>
      <NewConversationDialog open={picker} onOpenChange={setPicker} onPick={(id) => start.mutate(id, { onError: (e) => toast.error(errorMessage(e)) })} />
    </>
  )
}
