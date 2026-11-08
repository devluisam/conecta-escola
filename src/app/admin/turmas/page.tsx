"use client"

import { Loader2, Pencil, Plus, School, Trash2, Users } from "lucide-react"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { SubjectTag } from "@/components/shared/badges"
import { ConfirmAction } from "@/components/shared/confirm-button"
import { FormField } from "@/components/shared/form-field"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import type { ClassView } from "@/lib/data/repository"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { SchoolClass } from "@/lib/types"

const SHIFTS = ["Manhã", "Tarde", "Noite", "Integral"] as const
const schema = z.object({
  name: z.string().trim().min(2, "Informe o nome da turma.").max(40),
  series: z.string().trim().min(2, "Informe a série.").max(60),
  shift: z.enum(SHIFTS),
  year: z.coerce.number<string>().int().min(2020).max(2100),
  room: z.string().max(30),
})

function ClassDialog({ cls, onClose }: { cls: ClassView | null; onClose: () => void }) {
  const form = useForm<z.input<typeof schema>, unknown, z.output<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: cls?.name ?? "", series: cls?.series ?? "", shift: cls?.shift ?? "Manhã", year: String(cls?.year ?? new Date().getFullYear()), room: cls?.room ?? "" },
  })
  const save = useRepoMutation((r, v: Omit<SchoolClass, "id" | "schoolId"> & { id?: string }) => r.saveClass(v), {
    success: cls ? "Turma atualizada." : "Turma criada.",
    onSuccess: onClose,
  })
  const e = form.formState.errors
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy">{cls ? "Editar turma" : "Nova turma"}</DialogTitle>
          <DialogDescription>Depois de criar, vincule professores e matricule alunos.</DialogDescription>
        </DialogHeader>
        <form id="class-form" className="grid gap-4 sm:grid-cols-2" noValidate onSubmit={form.handleSubmit((v) => save.mutate({ ...v, room: v.room || null, id: cls?.id }))}>
          <FormField id="cl-name" label="Nome" error={e.name?.message} required>
            <Input id="cl-name" placeholder="Ex.: 8º Ano C" {...form.register("name")} aria-invalid={Boolean(e.name)} />
          </FormField>
          <FormField id="cl-year" label="Ano letivo" error={e.year?.message}>
            <Input id="cl-year" type="number" {...form.register("year")} />
          </FormField>
          <FormField id="cl-series" label="Série / etapa" error={e.series?.message} className="sm:col-span-2" required>
            <Input id="cl-series" placeholder="Ex.: 8º ano – Ensino Fundamental" {...form.register("series")} aria-invalid={Boolean(e.series)} />
          </FormField>
          <FormField id="cl-shift" label="Turno">
            <select id="cl-shift" className="h-10 w-full rounded-lg border border-input bg-white px-3 text-sm" {...form.register("shift")}>
              {SHIFTS.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </FormField>
          <FormField id="cl-room" label="Sala">
            <Input id="cl-room" {...form.register("room")} />
          </FormField>
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="class-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminClassesPage() {
  const { data, isLoading, error, refetch } = useRepoQuery(["classes"], (r) => r.listClasses())
  const remove = useRepoMutation((r, id: string) => r.deleteClass(id), { success: "Turma excluída." })
  const [editing, setEditing] = useState<ClassView | null | "new">(null)
  return (
    <>
      <PageHeader
        title="Turmas"
        description="Organize as turmas do ano letivo, turnos e salas."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Nova turma
          </Button>
        }
      />
      {isLoading ? (
        <GridSkeleton items={3} />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !data?.length ? (
        <EmptyState icon={School} title="Nenhuma turma cadastrada" />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((c) => (
            <li key={c.id} className="flex flex-col rounded-xl bg-card p-5 ring-1 ring-foreground/[0.06]">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-lg font-bold text-navy">{c.name}</p>
                  <p className="text-sm text-muted-foreground">{c.series}</p>
                  <p className="text-xs text-muted-foreground">
                    {c.shift} · {c.room ?? "sem sala"} · {c.year}
                  </p>
                </div>
                <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand">
                  <Users className="size-3.5" aria-hidden /> {c.students}
                </span>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {c.teachers.length === 0 && <span className="text-xs text-muted-foreground">Nenhum professor vinculado</span>}
                {c.teachers.map((t) => (
                  <SubjectTag key={t.subject.id} subject={t.subject} />
                ))}
              </div>
              <div className="mt-auto flex gap-2 pt-4">
                <Button variant="outline" size="sm" onClick={() => setEditing(c)}>
                  <Pencil /> Editar
                </Button>
                <ConfirmAction
                  trigger={
                    <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive">
                      <Trash2 /> Excluir
                    </Button>
                  }
                  title={`Excluir ${c.name}?`}
                  description="Só é possível excluir turmas sem alunos matriculados. Os vínculos de professores serão removidos."
                  confirmLabel="Excluir"
                  onConfirm={() => remove.mutate(c.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      {editing && <ClassDialog cls={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
