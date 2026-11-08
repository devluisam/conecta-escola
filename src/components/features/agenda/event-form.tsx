"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { Loader2 } from "lucide-react"
import { useMemo } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { useUser } from "@/components/auth/auth-provider"
import { FormField } from "@/components/shared/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { EventInput, EventView } from "@/lib/data/repository"
import { eventTypeLabel } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { EventType } from "@/lib/types"

const schema = z
  .object({
    title: z.string().trim().min(3, "Mínimo de 3 caracteres.").max(120),
    type: z.enum(["prova", "trabalho", "aula", "evento", "feriado"]),
    date: z.string().min(1, "Informe a data."),
    start: z.string().min(1, "Informe o horário."),
    end: z.string().min(1, "Informe o horário."),
    classId: z.string().min(1, "Selecione a turma."),
    subjectId: z.string(),
    location: z.string().max(120),
    description: z.string().max(1000),
  })
  .refine((v) => v.end > v.start, { path: ["end"], message: "O término deve ser após o início." })
type Values = z.infer<typeof schema>

const SCHOOL = "__escola"
const NONE = "__nenhuma"

export function EventFormDialog({ event, defaultDate, onClose }: { event: EventView | null; defaultDate: Date | null; onClose: () => void }) {
  const user = useUser()
  const isAdmin = user.role === "admin"
  const contexts = useRepoQuery(["teaching-contexts"], (r) => r.listTeachingContexts())
  const subjectsAll = useRepoQuery(["all-subjects"], (r) => r.listAllSubjects())

  const classes = useMemo(() => [...new Map((contexts.data ?? []).map((c) => [c.schoolClass.id, c.schoolClass])).values()], [contexts.data])
  const start = event ? new Date(event.startsAt) : defaultDate ? new Date(new Date(defaultDate).setHours(8, 0, 0, 0)) : new Date()
  const end = event ? new Date(event.endsAt) : new Date(start.getTime() + 60 * 60000)

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: event?.title ?? "",
      type: event?.type ?? (isAdmin ? "evento" : "aula"),
      date: format(start, "yyyy-MM-dd"),
      start: format(start, "HH:mm"),
      end: format(end, "HH:mm"),
      classId: event ? (event.classId ?? SCHOOL) : isAdmin ? SCHOOL : "",
      subjectId: event?.subjectId ?? NONE,
      location: event?.location ?? "",
      description: event?.description ?? "",
    },
  })
  const classId = form.watch("classId")
  const subjectOptions = isAdmin
    ? (subjectsAll.data ?? [])
    : (contexts.data ?? []).filter((c) => c.schoolClass.id === classId).map((c) => c.subject)

  const save = useRepoMutation((r, input: EventInput) => r.saveEvent(input), {
    success: event ? "Compromisso atualizado." : "Compromisso agendado e turma notificada.",
    onSuccess: onClose,
  })

  const onSubmit = form.handleSubmit((v) =>
    save.mutate({
      id: event?.id,
      title: v.title,
      type: v.type,
      startsAt: new Date(`${v.date}T${v.start}`).toISOString(),
      endsAt: new Date(`${v.date}T${v.end}`).toISOString(),
      classId: v.classId === SCHOOL ? null : v.classId,
      subjectId: v.subjectId === NONE ? null : v.subjectId,
      location: v.location || null,
      description: v.description || null,
    }),
  )
  const e = form.formState.errors

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-navy">{event ? "Editar compromisso" : "Novo compromisso"}</DialogTitle>
          <DialogDescription>{isAdmin ? "Eventos sem turma aparecem no calendário de toda a escola." : "O compromisso aparece na agenda dos alunos da turma."}</DialogDescription>
        </DialogHeader>
        <form id="event-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="ev-title" label="Título" error={e.title?.message} className="sm:col-span-2" required>
            <Input id="ev-title" {...form.register("title")} aria-invalid={Boolean(e.title)} />
          </FormField>
          <FormField id="ev-type" label="Tipo" required>
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v as EventType)}>
                  <SelectTrigger id="ev-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(eventTypeLabel) as EventType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {eventTypeLabel[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="ev-date" label="Data" error={e.date?.message} required>
            <Input id="ev-date" type="date" {...form.register("date")} />
          </FormField>
          <FormField id="ev-start" label="Início" error={e.start?.message} required>
            <Input id="ev-start" type="time" {...form.register("start")} />
          </FormField>
          <FormField id="ev-end" label="Término" error={e.end?.message} required>
            <Input id="ev-end" type="time" {...form.register("end")} aria-invalid={Boolean(e.end)} />
          </FormField>
          <FormField id="ev-class" label="Turma" error={e.classId?.message} required>
            <Controller
              control={form.control}
              name="classId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    form.setValue("subjectId", NONE)
                  }}
                >
                  <SelectTrigger id="ev-class" className="w-full" aria-invalid={Boolean(e.classId)}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {isAdmin && <SelectItem value={SCHOOL}>Toda a escola</SelectItem>}
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
          <FormField id="ev-subject" label="Disciplina">
            <Controller
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="ev-subject" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>Nenhuma</SelectItem>
                    {subjectOptions.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="ev-location" label="Local" className="sm:col-span-2">
            <Input id="ev-location" placeholder="Ex.: Sala 12, Laboratório, Quadra" {...form.register("location")} />
          </FormField>
          <FormField id="ev-desc" label="Descrição" className="sm:col-span-2">
            <Textarea id="ev-desc" rows={3} {...form.register("description")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="event-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
