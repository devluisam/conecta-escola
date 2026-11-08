"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { addDays, format } from "date-fns"
import { Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { FilePicker } from "@/components/shared/file-picker"
import { FormField } from "@/components/shared/form-field"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import type { ActivityInput, ActivityView } from "@/lib/data/repository"
import { activityTypeLabel } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { ActivityType, FileRef } from "@/lib/types"

const schema = z.object({
  title: z.string().trim().min(3, "Mínimo de 3 caracteres.").max(140),
  description: z.string().trim().min(5, "Descreva a atividade.").max(3000),
  type: z.enum(["tarefa", "trabalho", "prova", "questionario"]),
  context: z.string().min(1, "Selecione turma e disciplina."),
  dueDate: z.string().min(1, "Informe a data."),
  dueTime: z.string().min(1, "Informe o horário."),
  maxScore: z.coerce.number<string>().positive("Deve ser maior que zero.").max(100, "Máximo 100."),
  publish: z.boolean(),
})
type Values = z.input<typeof schema>

export function ActivityFormDialog({ activity, onClose }: { activity: ActivityView | null; onClose: () => void }) {
  const contexts = useRepoQuery(["teaching-contexts"], (r) => r.listTeachingContexts())
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())
  const [attachment, setAttachment] = useState<FileRef | null>(activity?.attachment ?? null)
  const due = activity ? new Date(activity.dueAt) : addDays(new Date(), 7)
  const form = useForm<Values, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: activity?.title ?? "",
      description: activity?.description ?? "",
      type: activity?.type ?? "tarefa",
      context: activity ? `${activity.classId}|${activity.subjectId}` : "",
      dueDate: format(due, "yyyy-MM-dd"),
      dueTime: activity ? format(due, "HH:mm") : "23:59",
      maxScore: String(activity?.maxScore ?? 10),
      publish: activity ? activity.status === "publicada" : true,
    },
  })
  const options = useMemo(
    () => (contexts.data ?? []).map((c) => ({ value: `${c.schoolClass.id}|${c.subject.id}`, label: `${c.schoolClass.name} · ${c.subject.name}` })),
    [contexts.data],
  )
  const save = useRepoMutation((r, input: ActivityInput) => r.saveActivity(input), {
    success: (a) => (activity ? "Atividade atualizada." : a.status === "publicada" ? "Atividade publicada! Os alunos foram notificados." : "Rascunho salvo."),
    onSuccess: onClose,
  })
  const onSubmit = form.handleSubmit((v) => {
    const [classId, subjectId] = v.context.split("|")
    save.mutate({
      id: activity?.id,
      title: v.title,
      description: v.description,
      type: v.type,
      classId,
      subjectId,
      dueAt: new Date(`${v.dueDate}T${v.dueTime}`).toISOString(),
      maxScore: v.maxScore,
      status: v.publish ? "publicada" : "rascunho",
      attachment,
    })
  })
  const e = form.formState.errors

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-navy">{activity ? "Editar atividade" : "Nova atividade"}</DialogTitle>
          <DialogDescription>Defina turma, prazo e pontuação. A atividade aparece na agenda e nas tarefas dos alunos.</DialogDescription>
        </DialogHeader>
        <form id="activity-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="ac-title" label="Título" error={e.title?.message} className="sm:col-span-2" required>
            <Input id="ac-title" placeholder="Ex.: Lista de exercícios – frações" {...form.register("title")} aria-invalid={Boolean(e.title)} />
          </FormField>
          <FormField id="ac-context" label="Turma e disciplina" error={e.context?.message} className="sm:col-span-2" required>
            <Controller
              control={form.control}
              name="context"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={Boolean(activity)}>
                  <SelectTrigger id="ac-context" className="w-full" aria-invalid={Boolean(e.context)}>
                    <SelectValue placeholder={contexts.isLoading ? "Carregando…" : "Selecione"} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="ac-type" label="Tipo">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v as ActivityType)}>
                  <SelectTrigger id="ac-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(activityTypeLabel) as ActivityType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {activityTypeLabel[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="ac-score" label="Pontuação máxima" error={e.maxScore?.message} required>
            <Input id="ac-score" type="number" min={1} max={100} step={0.5} {...form.register("maxScore")} aria-invalid={Boolean(e.maxScore)} />
          </FormField>
          <FormField id="ac-date" label="Prazo de entrega" error={e.dueDate?.message} required>
            <Input id="ac-date" type="date" {...form.register("dueDate")} />
          </FormField>
          <FormField id="ac-time" label="Horário limite" error={e.dueTime?.message} required>
            <Input id="ac-time" type="time" {...form.register("dueTime")} />
          </FormField>
          <FormField id="ac-desc" label="Orientações" error={e.description?.message} className="sm:col-span-2" required>
            <Textarea id="ac-desc" rows={5} placeholder="Explique o que deve ser feito, critérios de avaliação e formato de entrega." {...form.register("description")} aria-invalid={Boolean(e.description)} />
          </FormField>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-navy">Material de apoio (opcional)</Label>
            <FilePicker value={attachment} onChange={setAttachment} maxMb={ctx.data?.settings.maxUploadMb ?? 2} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-surface p-3 sm:col-span-2">
            <Label htmlFor="ac-publish" className="flex-col items-start gap-0.5">
              <span className="text-navy">Publicar para os alunos</span>
              <span className="text-xs font-normal text-muted-foreground">Desative para salvar como rascunho.</span>
            </Label>
            <Switch id="ac-publish" checked={form.watch("publish")} onCheckedChange={(v) => form.setValue("publish", v)} />
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="activity-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} {activity ? "Salvar" : "Criar atividade"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
