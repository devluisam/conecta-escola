"use client"

import { Layers, Loader2, Pencil, Plus, Trash2 } from "lucide-react"
import { useState } from "react"
import { ConfirmAction } from "@/components/shared/confirm-button"
import { FormField } from "@/components/shared/form-field"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { Subject } from "@/lib/types"

const COLORS = ["#1877D2", "#7C4DDB", "#22A06B", "#D9822B", "#0E9AA7", "#D23B6B", "#5B6B82", "#B7791F"]

function SubjectDialog({ subject, onClose }: { subject: Subject | null; onClose: () => void }) {
  const [name, setName] = useState(subject?.name ?? "")
  const [code, setCode] = useState(subject?.code ?? "")
  const [workload, setWorkload] = useState(String(subject?.workload ?? 80))
  const [color, setColor] = useState(subject?.color ?? COLORS[0])
  const [error, setError] = useState<string | null>(null)
  const save = useRepoMutation((r, v: Omit<Subject, "id"> & { id?: string }) => r.saveSubject(v), {
    success: subject ? "Disciplina atualizada." : "Disciplina criada.",
    onSuccess: onClose,
  })
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-navy">{subject ? "Editar disciplina" : "Nova disciplina"}</DialogTitle>
          <DialogDescription>A cor identifica a disciplina em toda a plataforma.</DialogDescription>
        </DialogHeader>
        <form
          id="subject-form"
          className="grid gap-4 sm:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (name.trim().length < 2) return setError("Informe o nome.")
            if (!/^[A-Za-z]{2,5}$/.test(code.trim())) return setError("Sigla com 2 a 5 letras.")
            if (!(Number(workload) > 0)) return setError("Carga horária inválida.")
            save.mutate({ id: subject?.id, name: name.trim(), code: code.trim().toUpperCase(), workload: Number(workload), color })
          }}
        >
          <FormField id="sb-name" label="Nome" className="sm:col-span-2" required>
            <Input id="sb-name" value={name} onChange={(e) => setName(e.target.value)} />
          </FormField>
          <FormField id="sb-code" label="Sigla" required>
            <Input id="sb-code" value={code} onChange={(e) => setCode(e.target.value)} maxLength={5} className="uppercase" />
          </FormField>
          <FormField id="sb-work" label="Carga horária anual (h)">
            <Input id="sb-work" type="number" value={workload} onChange={(e) => setWorkload(e.target.value)} />
          </FormField>
          <fieldset className="sm:col-span-2">
            <legend className="mb-2 text-sm font-medium text-navy">Cor</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  aria-pressed={color === c}
                  aria-label={`Cor ${c}`}
                  className="size-8 rounded-full ring-offset-2 transition-shadow aria-pressed:ring-2 aria-pressed:ring-navy"
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </fieldset>
          {error && (
            <p role="alert" className="text-[13px] text-destructive sm:col-span-2">
              {error}
            </p>
          )}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="subject-form" disabled={save.isPending}>
            {save.isPending && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminSubjectsPage() {
  const { data, isLoading, error, refetch } = useRepoQuery(["all-subjects"], (r) => r.listAllSubjects())
  const assignments = useRepoQuery(["assignments"], (r) => r.listAssignments())
  const remove = useRepoMutation((r, id: string) => r.deleteSubject(id), { success: "Disciplina excluída." })
  const [editing, setEditing] = useState<Subject | null | "new">(null)
  return (
    <>
      <PageHeader
        title="Disciplinas"
        description="Componentes curriculares oferecidos pela escola."
        actions={
          <Button onClick={() => setEditing("new")}>
            <Plus /> Nova disciplina
          </Button>
        }
      />
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06]">
        {isLoading ? (
          <ListSkeleton className="p-4" />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : !data?.length ? (
          <div className="p-4">
            <EmptyState icon={Layers} title="Nenhuma disciplina" className="border-0" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Disciplina</TableHead>
                  <TableHead>Sigla</TableHead>
                  <TableHead>Carga horária</TableHead>
                  <TableHead>Turmas</TableHead>
                  <TableHead className="pr-5 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="pl-5">
                      <span className="flex items-center gap-2.5 font-medium text-navy">
                        <span className="size-3 rounded-full" style={{ backgroundColor: s.color }} aria-hidden />
                        {s.name}
                      </span>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{s.code}</TableCell>
                    <TableCell>{s.workload} h</TableCell>
                    <TableCell>{(assignments.data ?? []).filter((a) => a.subject.id === s.id).length}</TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(s)} aria-label={`Editar ${s.name}`}>
                        <Pencil />
                      </Button>
                      <ConfirmAction
                        trigger={
                          <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive" aria-label={`Excluir ${s.name}`}>
                            <Trash2 />
                          </Button>
                        }
                        title={`Excluir ${s.name}?`}
                        description="Só é possível excluir disciplinas sem vínculos ou atividades."
                        confirmLabel="Excluir"
                        onConfirm={() => remove.mutate(s.id)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {editing && <SubjectDialog subject={editing === "new" ? null : editing} onClose={() => setEditing(null)} />}
    </>
  )
}
