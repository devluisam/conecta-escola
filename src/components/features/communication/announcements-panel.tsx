"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { AlertTriangle, Loader2, Megaphone, Plus, Trash2 } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { useUser } from "@/components/auth/auth-provider"
import { ConfirmAction } from "@/components/shared/confirm-button"
import { FormField } from "@/components/shared/form-field"
import { UserAvatar } from "@/components/shared/badges"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { AnnouncementInput } from "@/lib/data/repository"
import { fmtDateTime, fmtRelative } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { Audience } from "@/lib/types"
import { cn } from "@/lib/utils"

const NONE = "__nenhuma"
const schema = z.object({
  title: z.string().trim().min(3, "Mínimo de 3 caracteres.").max(120),
  body: z.string().trim().min(5, "Escreva o conteúdo do aviso.").max(2000),
  audience: z.enum(["todos", "alunos", "professores"]),
  classId: z.string(),
  important: z.boolean(),
})
type Values = z.infer<typeof schema>

const audienceLabel: Record<Audience, string> = { todos: "Toda a comunidade", alunos: "Alunos", professores: "Professores" }

function AnnouncementForm({ onClose }: { onClose: () => void }) {
  const user = useUser()
  const isAdmin = user.role === "admin"
  const contexts = useRepoQuery(["teaching-contexts"], (r) => r.listTeachingContexts())
  const classes = useMemo(() => [...new Map((contexts.data ?? []).map((c) => [c.schoolClass.id, c.schoolClass])).values()], [contexts.data])
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", body: "", audience: isAdmin ? "todos" : "alunos", classId: NONE, important: false },
  })
  const save = useRepoMutation((r, input: AnnouncementInput) => r.saveAnnouncement(input), {
    success: "Comunicado publicado e destinatários notificados.",
    onSuccess: onClose,
  })
  const onSubmit = form.handleSubmit((v) => {
    if (!isAdmin && v.classId === NONE) {
      form.setError("classId", { message: "Selecione a turma." })
      return
    }
    save.mutate({ title: v.title, body: v.body, audience: v.audience, classId: v.classId === NONE ? null : v.classId, priority: v.important ? "importante" : "normal" })
  })
  const e = form.formState.errors
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-navy">Novo comunicado</DialogTitle>
          <DialogDescription>{isAdmin ? "Avisos institucionais podem ir para toda a escola ou para uma turma." : "O comunicado será enviado aos alunos da turma escolhida."}</DialogDescription>
        </DialogHeader>
        <form id="ann-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="an-title" label="Título" error={e.title?.message} className="sm:col-span-2" required>
            <Input id="an-title" {...form.register("title")} aria-invalid={Boolean(e.title)} />
          </FormField>
          {isAdmin && (
            <FormField id="an-aud" label="Público">
              <Controller
                control={form.control}
                name="audience"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="an-aud" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(audienceLabel) as Audience[]).map((a) => (
                        <SelectItem key={a} value={a}>
                          {audienceLabel[a]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField id="an-class" label="Turma" error={e.classId?.message} className={isAdmin ? "" : "sm:col-span-2"} required={!isAdmin}>
            <Controller
              control={form.control}
              name="classId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="an-class" className="w-full" aria-invalid={Boolean(e.classId)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>{isAdmin ? "Todas as turmas" : "Selecione"}</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="an-body" label="Mensagem" error={e.body?.message} className="sm:col-span-2" required>
            <Textarea id="an-body" rows={5} {...form.register("body")} aria-invalid={Boolean(e.body)} />
          </FormField>
          <div className="flex items-center gap-2.5 sm:col-span-2">
            <Checkbox id="an-imp" checked={form.watch("important")} onCheckedChange={(v) => form.setValue("important", v === true)} />
            <Label htmlFor="an-imp" className="font-normal">
              Marcar como importante
            </Label>
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="ann-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function AnnouncementsPanel({ canPost = false }: { canPost?: boolean }) {
  const { data, isLoading, error, refetch } = useRepoQuery(["announcements"], (r) => r.listAnnouncements())
  const remove = useRepoMutation((r, id: string) => r.deleteAnnouncement(id), { success: "Comunicado removido." })
  const [creating, setCreating] = useState(false)
  return (
    <div>
      {canPost && (
        <div className="mb-4 flex justify-end">
          <Button onClick={() => setCreating(true)}>
            <Plus /> Novo comunicado
          </Button>
        </div>
      )}
      {isLoading ? (
        <ListSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon={Megaphone} title="Nenhum aviso publicado" />
      ) : (
        <ul className="space-y-3">
          {data.map((a) => (
            <li
              key={a.id}
              className={cn("rounded-xl border-l-4 bg-card p-4 ring-1 ring-foreground/[0.06] sm:p-5", a.priority === "importante" ? "border-l-reward" : "border-l-brand")}
            >
              <div className="flex items-start gap-3">
                <UserAvatar user={a.author} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-navy">{a.title}</h3>
                    {a.priority === "importante" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-reward-50 px-2 py-0.5 text-[11px] font-semibold text-reward-700">
                        <AlertTriangle className="size-3" aria-hidden /> Importante
                      </span>
                    )}
                    <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">{a.className ?? audienceLabel[a.audience]}</span>
                  </div>
                  <p className="mt-1.5 text-[15px] whitespace-pre-line text-foreground/85">{a.body}</p>
                  <p className="mt-2 text-xs text-muted-foreground" title={fmtDateTime(a.createdAt)}>
                    {a.author.name} · {fmtRelative(a.createdAt)}
                  </p>
                </div>
                {a.canDelete && (
                  <ConfirmAction
                    trigger={
                      <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Excluir aviso ${a.title}`}>
                        <Trash2 />
                      </Button>
                    }
                    title="Excluir comunicado?"
                    description="O aviso deixará de aparecer para os destinatários."
                    confirmLabel="Excluir"
                    onConfirm={() => remove.mutate(a.id)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {creating && <AnnouncementForm onClose={() => setCreating(false)} />}
    </div>
  )
}
