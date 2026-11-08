"use client"

import { Link2, Loader2, Trash2 } from "lucide-react"
import { useState } from "react"
import { SubjectTag, UserAvatar } from "@/components/shared/badges"
import { ConfirmAction } from "@/components/shared/confirm-button"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"

export default function AdminLinksPage() {
  const assignments = useRepoQuery(["assignments"], (r) => r.listAssignments())
  const teachers = useRepoQuery(["users", "professor"], (r) => r.listUsers({ role: "professor" }))
  const classes = useRepoQuery(["classes"], (r) => r.listClasses())
  const subjects = useRepoQuery(["all-subjects"], (r) => r.listAllSubjects())
  const [teacherId, setTeacherId] = useState("")
  const [classId, setClassId] = useState("")
  const [subjectId, setSubjectId] = useState("")
  const save = useRepoMutation((r, v: { teacherId: string; classId: string; subjectId: string }) => r.saveAssignment(v), {
    success: "Vínculo salvo. O professor já pode acessar a turma.",
    onSuccess: () => setSubjectId(""),
  })
  const remove = useRepoMutation((r, id: string) => r.deleteAssignment(id), { success: "Vínculo removido." })
  const teacherName = (id: string) => teachers.data?.find((t) => t.id === id)
  const existing = assignments.data?.find((a) => a.schoolClass.id === classId && a.subject.id === subjectId)

  const byClass = (classes.data ?? []).map((c) => ({ cls: c, items: (assignments.data ?? []).filter((a) => a.schoolClass.id === c.id) }))

  return (
    <>
      <PageHeader title="Vínculos" description="Defina qual professor leciona cada disciplina em cada turma. Isso controla o que cada professor pode ver e editar." />
      <Panel title="Novo vínculo" className="mb-5">
        <form
          className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            if (teacherId && classId && subjectId) save.mutate({ teacherId, classId, subjectId })
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="lk-teacher">Professor(a)</Label>
            <Select value={teacherId} onValueChange={setTeacherId}>
              <SelectTrigger id="lk-teacher" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(teachers.data ?? []).filter((t) => t.active).map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lk-class">Turma</Label>
            <Select value={classId} onValueChange={setClassId}>
              <SelectTrigger id="lk-class" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(classes.data ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="lk-subject">Disciplina</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger id="lk-subject" className="w-full">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(subjects.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={!teacherId || !classId || !subjectId || save.isPending}>
            {save.isPending ? <Loader2 className="animate-spin" /> : <Link2 />} {existing ? "Substituir" : "Vincular"}
          </Button>
        </form>
        {existing && (
          <p className="mt-2 text-xs text-amber-800">
            Esta disciplina já está vinculada a {teacherName(existing.assignment.teacherId)?.name ?? "outro professor"} nesta turma — o vínculo será substituído.
          </p>
        )}
      </Panel>

      {assignments.isLoading ? (
        <ListSkeleton />
      ) : assignments.error ? (
        <ErrorState error={assignments.error} onRetry={assignments.refetch} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {byClass.map(({ cls, items }) => (
            <Panel key={cls.id} title={`${cls.name} · ${cls.students} alunos`}>
              {items.length === 0 ? (
                <EmptyState icon={Link2} title="Sem professores vinculados" className="py-5" />
              ) : (
                <ul className="divide-y">
                  {items.map((a) => {
                    const t = teacherName(a.assignment.teacherId)
                    return (
                      <li key={a.assignment.id} className="flex items-center gap-3 py-2.5">
                        <SubjectTag subject={a.subject} className="w-36 shrink-0 justify-start" />
                        <span className="flex min-w-0 flex-1 items-center gap-2">
                          {t && <UserAvatar user={t} size="sm" />}
                          <span className="truncate text-sm font-medium text-navy">{t?.name ?? "—"}</span>
                        </span>
                        <ConfirmAction
                          trigger={
                            <Button variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" aria-label={`Remover vínculo de ${a.subject.name} em ${cls.name}`}>
                              <Trash2 />
                            </Button>
                          }
                          title="Remover vínculo?"
                          description={`${t?.name ?? "O professor"} perderá o acesso a ${a.subject.name} em ${cls.name}. As atividades e notas já lançadas são mantidas.`}
                          confirmLabel="Remover"
                          onConfirm={() => remove.mutate(a.assignment.id)}
                        />
                      </li>
                    )
                  })}
                </ul>
              )}
            </Panel>
          ))}
        </div>
      )}
    </>
  )
}
