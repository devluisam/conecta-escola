"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { useMemo, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { FilePicker } from "@/components/shared/file-picker"
import { FormField } from "@/components/shared/form-field"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { MaterialInput } from "@/lib/data/repository"
import { materialTypeLabel } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { FileRef, MaterialType } from "@/lib/types"

const ALL = "__todas"
const schema = z.object({
  title: z.string().trim().min(3, "Mínimo de 3 caracteres.").max(120),
  description: z.string().trim().max(400),
  type: z.enum(["pdf", "video", "link", "apresentacao", "livro"]),
  subjectId: z.string().min(1, "Selecione a disciplina."),
  classId: z.string(),
  url: z.union([z.literal(""), z.url("Informe um link válido.").startsWith("https://", "Use um link seguro (https://).")]),
  downloadable: z.boolean(),
})
type Values = z.infer<typeof schema>

export function MaterialFormDialog({ onClose }: { onClose: () => void }) {
  const contexts = useRepoQuery(["teaching-contexts"], (r) => r.listTeachingContexts())
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())
  const [file, setFile] = useState<FileRef | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { title: "", description: "", type: "pdf", subjectId: "", classId: ALL, url: "", downloadable: true },
  })
  const subjectId = form.watch("subjectId")
  const type = form.watch("type")
  const subjects = useMemo(() => [...new Map((contexts.data ?? []).map((c) => [c.subject.id, c.subject])).values()], [contexts.data])
  const classes = (contexts.data ?? []).filter((c) => c.subject.id === subjectId).map((c) => c.schoolClass)

  const save = useRepoMutation((r, input: MaterialInput) => r.saveMaterial(input), {
    success: "Material publicado! Os alunos foram notificados.",
    onSuccess: onClose,
  })
  const onSubmit = form.handleSubmit((v) => {
    if (v.type === "link" ? !v.url : !file && !v.url) {
      setFileError(v.type === "link" ? "Informe o link." : "Anexe um arquivo ou informe um link.")
      return
    }
    save.mutate({
      title: v.title,
      description: v.description,
      type: v.type,
      subjectId: v.subjectId,
      classId: v.classId === ALL ? null : v.classId,
      file: v.type === "link" ? null : file,
      url: v.url || null,
      downloadable: v.downloadable,
    })
  })
  const e = form.formState.errors

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-navy">Publicar material</DialogTitle>
          <DialogDescription>O material fica disponível na Biblioteca Digital das turmas selecionadas.</DialogDescription>
        </DialogHeader>
        <form id="material-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          <FormField id="mt-title" label="Título" error={e.title?.message} className="sm:col-span-2" required>
            <Input id="mt-title" {...form.register("title")} aria-invalid={Boolean(e.title)} />
          </FormField>
          <FormField id="mt-subject" label="Disciplina" error={e.subjectId?.message} required>
            <Controller
              control={form.control}
              name="subjectId"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v)
                    form.setValue("classId", ALL)
                  }}
                >
                  <SelectTrigger id="mt-subject" className="w-full" aria-invalid={Boolean(e.subjectId)}>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="mt-class" label="Turma">
            <Controller
              control={form.control}
              name="classId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={!subjectId}>
                  <SelectTrigger id="mt-class" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Todas as minhas turmas</SelectItem>
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
          <FormField id="mt-type" label="Tipo" className="sm:col-span-2">
            <Controller
              control={form.control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => field.onChange(v as MaterialType)}>
                  <SelectTrigger id="mt-type" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(materialTypeLabel) as MaterialType[]).map((t) => (
                      <SelectItem key={t} value={t}>
                        {materialTypeLabel[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FormField>
          <FormField id="mt-desc" label="Descrição" className="sm:col-span-2">
            <Textarea id="mt-desc" rows={2} {...form.register("description")} />
          </FormField>
          {type !== "link" && (
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-navy">Arquivo</Label>
              <FilePicker value={file} onChange={(f) => (setFile(f), setFileError(null))} maxMb={ctx.data?.settings.maxUploadMb ?? 2} />
            </div>
          )}
          <FormField id="mt-url" label={type === "link" || type === "video" ? "Link (https://)" : "Ou informe um link"} error={e.url?.message} className="sm:col-span-2">
            <Input id="mt-url" type="url" placeholder="https://" {...form.register("url")} aria-invalid={Boolean(e.url)} />
          </FormField>
          {fileError && (
            <p role="alert" className="text-[13px] text-destructive sm:col-span-2">
              {fileError}
            </p>
          )}
          <div className="flex items-center gap-2.5 sm:col-span-2">
            <Checkbox id="mt-dl" checked={form.watch("downloadable")} onCheckedChange={(v) => form.setValue("downloadable", v === true)} />
            <Label htmlFor="mt-dl" className="font-normal">
              Permitir download pelos alunos
            </Label>
          </div>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="material-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Publicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
