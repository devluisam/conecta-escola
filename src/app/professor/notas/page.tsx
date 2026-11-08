"use client"

import { BookOpenCheck, Loader2, Plus, Save, ShieldCheck, Undo2 } from "lucide-react"
import { useMemo, useState } from "react"
import { UserAvatar } from "@/components/shared/badges"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { average } from "@/lib/academic"
import type { Repository } from "@/lib/data/repository"
import { fmtScore } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { Grade } from "@/lib/types"
import { cn } from "@/lib/utils"

type Change = { key: string; studentId: string; label: string; value: string; gradeId?: string }

const parse = (v: string) => Number(v.replace(",", "."))
const isValid = (v: string) => v === "" || (!Number.isNaN(parse(v)) && parse(v) >= 0 && parse(v) <= 10)

async function applyChanges(r: Repository, ctx: { classId: string; subjectId: string; term: Grade["term"] }, changes: Change[]) {
  for (const c of changes) {
    if (c.value === "") {
      if (c.gradeId) await r.deleteGrade(c.gradeId)
    } else {
      await r.saveGrade({ id: c.gradeId, studentId: c.studentId, classId: ctx.classId, subjectId: ctx.subjectId, term: ctx.term, label: c.label, score: parse(c.value), maxScore: 10 })
    }
  }
  return changes.length
}

export default function TeacherGradesPage() {
  const contexts = useRepoQuery(["teaching-contexts"], (r) => r.listTeachingContexts())
  const settings = useRepoQuery(["context"], (r) => r.getMyContext())
  const [ctxKey, setCtxKey] = useState("")
  const [term, setTerm] = useState<Grade["term"] | null>(null)
  const [extraLabels, setExtraLabels] = useState<string[]>([])
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const [adding, setAdding] = useState(false)
  const [newLabel, setNewLabel] = useState("")

  const first = contexts.data?.[0]
  const activeKey = ctxKey || (first ? `${first.schoolClass.id}|${first.subject.id}` : "")
  const activeTerm = term ?? settings.data?.settings.currentTerm ?? 1
  const [classId, subjectId] = activeKey.split("|")
  const ready = Boolean(classId && subjectId)

  const roster = useRepoQuery(["roster", classId], (r) => r.getClassRoster(classId), { enabled: ready })
  const grades = useRepoQuery(["grades", { classId, subjectId, term: activeTerm }], (r) => r.listGrades({ classId, subjectId, term: activeTerm }), { enabled: ready })

  const labels = useMemo(() => {
    const fromData = [...new Set([...(grades.data ?? [])].sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((g) => g.label))]
    return [...fromData, ...extraLabels.filter((l) => !fromData.includes(l))]
  }, [grades.data, extraLabels])
  const gradeAt = (studentId: string, label: string) => grades.data?.find((g) => g.studentId === studentId && g.label === label)
  const cellKey = (studentId: string, label: string) => `${studentId}|${label}`
  const valueAt = (studentId: string, label: string) => {
    const k = cellKey(studentId, label)
    if (k in drafts) return drafts[k]
    const g = gradeAt(studentId, label)
    return g ? String(g.score).replace(".", ",") : ""
  }

  const changes: Change[] = Object.entries(drafts)
    .map(([key, value]) => {
      const [studentId, label] = key.split("|")
      const g = gradeAt(studentId, label)
      return { key, studentId, label, value: value.trim(), gradeId: g?.id }
    })
    .filter((c) => {
      const g = gradeAt(c.studentId, c.label)
      return g ? c.value === "" || parse(c.value) !== g.score : c.value !== ""
    })
  const hasInvalid = Object.values(drafts).some((v) => !isValid(v.trim()))

  const save = useRepoMutation((r, list: Change[]) => applyChanges(r, { classId, subjectId, term: activeTerm }, list), {
    success: (n) => `${n} nota(s) salva(s). Os alunos foram notificados.`,
    onSuccess: () => {
      setDrafts({})
      setExtraLabels([])
    },
  })

  const reset = () => {
    setDrafts({})
    setExtraLabels([])
  }

  return (
    <>
      <PageHeader title="Lançar notas" description="Registre as avaliações por turma, disciplina e bimestre. Notas de 0 a 10." />
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="space-y-1.5">
          <Label htmlFor="gr-ctx" className="text-navy">
            Turma e disciplina
          </Label>
          <Select
            value={activeKey}
            onValueChange={(v) => {
              setCtxKey(v)
              reset()
            }}
          >
            <SelectTrigger id="gr-ctx" className="w-full sm:w-72">
              <SelectValue placeholder="Carregando…" />
            </SelectTrigger>
            <SelectContent>
              {(contexts.data ?? []).map((c) => (
                <SelectItem key={c.assignment.id} value={`${c.schoolClass.id}|${c.subject.id}`}>
                  {c.schoolClass.name} · {c.subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="gr-term" className="text-navy">
            Bimestre
          </Label>
          <Select
            value={String(activeTerm)}
            onValueChange={(v) => {
              setTerm(Number(v) as Grade["term"])
              reset()
            }}
          >
            <SelectTrigger id="gr-term" className="w-full sm:w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4].map((t) => (
                <SelectItem key={t} value={String(t)}>
                  {t}º bimestre
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={() => setAdding(true)} disabled={!ready} className="sm:ml-auto">
          <Plus /> Nova avaliação
        </Button>
      </div>

      <Panel bodyClassName="px-0 pb-0">
        {roster.isLoading || grades.isLoading || !ready ? (
          <ListSkeleton className="px-5 pb-5" />
        ) : roster.error || grades.error ? (
          <div className="px-5 pb-5">
            <ErrorState error={roster.error ?? grades.error} />
          </div>
        ) : labels.length === 0 ? (
          <div className="px-5 pb-5">
            <EmptyState
              icon={BookOpenCheck}
              title="Nenhuma avaliação neste bimestre"
              description="Crie uma avaliação para começar a lançar as notas da turma."
              action={
                <Button onClick={() => setAdding(true)}>
                  <Plus /> Nova avaliação
                </Button>
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[560px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="sticky left-0 z-10 bg-card pl-5">Aluno(a)</TableHead>
                  {labels.map((l) => (
                    <TableHead key={l} className="min-w-28 text-center">
                      {l}
                    </TableHead>
                  ))}
                  <TableHead className="pr-5 text-center">Média</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(roster.data ?? []).map((s) => {
                  const values = labels.map((l) => valueAt(s.id, l)).filter((v) => v !== "" && isValid(v)).map(parse)
                  const avg = average(values)
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="sticky left-0 z-10 bg-card pl-5">
                        <span className="flex items-center gap-2">
                          <UserAvatar user={s} size="sm" className="hidden sm:grid" />
                          <span className="max-w-44 truncate font-medium text-navy">{s.name}</span>
                        </span>
                      </TableCell>
                      {labels.map((l) => {
                        const v = valueAt(s.id, l)
                        const k = cellKey(s.id, l)
                        const changed = k in drafts
                        return (
                          <TableCell key={l} className="text-center">
                            <Input
                              value={v}
                              inputMode="decimal"
                              onChange={(e) => setDrafts((d) => ({ ...d, [k]: e.target.value }))}
                              aria-label={`${l} de ${s.name}`}
                              aria-invalid={!isValid(v.trim())}
                              placeholder="—"
                              className={cn("mx-auto h-9 w-20 text-center tabular-nums", changed && isValid(v.trim()) && "border-brand bg-brand-50")}
                            />
                          </TableCell>
                        )
                      })}
                      <TableCell className={cn("pr-5 text-center font-bold tabular-nums", avg != null && avg < (settings.data?.settings.passingGrade ?? 6) ? "text-amber-700" : "text-navy")}>
                        {fmtScore(avg)}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="flex flex-col gap-3 border-t px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-4 text-success" aria-hidden /> Somente o professor responsável pela disciplina pode lançar ou alterar estas notas.
          </p>
          <div className="flex items-center gap-2">
            {hasInvalid && <span className="text-xs font-medium text-destructive">Corrija valores fora de 0–10</span>}
            {changes.length > 0 && (
              <Button variant="ghost" onClick={reset}>
                <Undo2 /> Descartar
              </Button>
            )}
            <Button onClick={() => save.mutate(changes)} disabled={!changes.length || hasInvalid || save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Salvar {changes.length ? `(${changes.length})` : ""}
            </Button>
          </div>
        </div>
      </Panel>

      <Dialog open={adding} onOpenChange={setAdding}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-navy">Nova avaliação</DialogTitle>
            <DialogDescription>Adiciona uma coluna para lançar as notas deste bimestre.</DialogDescription>
          </DialogHeader>
          <form
            id="label-form"
            onSubmit={(e) => {
              e.preventDefault()
              const l = newLabel.trim()
              if (!l || labels.includes(l)) return
              setExtraLabels((x) => [...x, l])
              setNewLabel("")
              setAdding(false)
            }}
          >
            <Label htmlFor="new-label" className="mb-1.5 text-navy">
              Nome da avaliação
            </Label>
            <Input id="new-label" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Ex.: Prova 2, Seminário" maxLength={30} autoFocus />
            {labels.includes(newLabel.trim()) && <p className="mt-1 text-[13px] text-destructive">Já existe uma avaliação com esse nome.</p>}
          </form>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdding(false)}>
              Cancelar
            </Button>
            <Button type="submit" form="label-form" disabled={!newLabel.trim()}>
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
