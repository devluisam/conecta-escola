"use client"

import { Check, Loader2, Minus, Save, ShieldCheck } from "lucide-react"
import { useState } from "react"
import { FormField } from "@/components/shared/form-field"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { PageSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { SchoolSettings } from "@/lib/types"

type Level = "sim" | "proprio" | "turmas" | "nao"
const matrix: { area: string; aluno: Level; professor: Level; admin: Level }[] = [
  { area: "Ver tarefas e atividades", aluno: "turmas", professor: "turmas", admin: "sim" },
  { area: "Criar e editar atividades", aluno: "nao", professor: "turmas", admin: "sim" },
  { area: "Enviar respostas de atividades", aluno: "proprio", professor: "nao", admin: "nao" },
  { area: "Corrigir entregas", aluno: "nao", professor: "turmas", admin: "sim" },
  { area: "Ver notas", aluno: "proprio", professor: "turmas", admin: "sim" },
  { area: "Lançar e alterar notas", aluno: "nao", professor: "turmas", admin: "nao" },
  { area: "Publicar materiais", aluno: "nao", professor: "turmas", admin: "sim" },
  { area: "Mensagens", aluno: "turmas", professor: "turmas", admin: "sim" },
  { area: "Comunicados", aluno: "nao", professor: "turmas", admin: "sim" },
  { area: "Agenda / calendário (edição)", aluno: "nao", professor: "turmas", admin: "sim" },
  { area: "Criar desafios", aluno: "nao", professor: "turmas", admin: "sim" },
  { area: "Cadastrar usuários, turmas e vínculos", aluno: "nao", professor: "nao", admin: "sim" },
]
const levelLabel: Record<Level, string> = { sim: "Total", proprio: "Somente os próprios", turmas: "Turmas vinculadas", nao: "Sem acesso" }

function LevelCell({ level }: { level: Level }) {
  if (level === "nao")
    return (
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
        <Minus className="size-3.5" aria-hidden /> {levelLabel[level]}
      </span>
    )
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${level === "sim" ? "bg-success-50 text-success" : "bg-brand-50 text-brand-600"}`}>
      <Check className="size-3.5" aria-hidden /> {levelLabel[level]}
    </span>
  )
}

export default function AdminPermissionsPage() {
  const { data } = useRepoQuery(["settings"], (r) => r.getSettings())
  if (!data) return <PageSkeleton />
  return <PermissionsContent initial={data} />
}

function PermissionsContent({ initial }: { initial: SchoolSettings }) {
  const [form, setForm] = useState<SchoolSettings>(initial)
  const save = useRepoMutation((r, patch: SchoolSettings) => r.updateSettings(patch), { success: "Configurações salvas." })
  const set = <K extends keyof SchoolSettings>(k: K, v: SchoolSettings[K]) => setForm((f) => ({ ...f, [k]: v }))
  const invalid = !(form.passingGrade >= 0 && form.passingGrade <= 10) || !(form.maxUploadMb >= 1 && form.maxUploadMb <= 10) || !(form.classGoalPoints > 0)

  return (
    <>
      <PageHeader title="Permissões e configurações" description="Quem pode fazer o quê na plataforma e as regras gerais da escola." />
      <Panel title="Matriz de permissões por perfil" bodyClassName="px-0 pb-2" className="mb-5">
        <div className="overflow-x-auto">
          <Table className="min-w-[640px]">
            <TableHeader>
              <TableRow>
                <TableHead className="pl-5">Recurso</TableHead>
                <TableHead>Aluno(a)</TableHead>
                <TableHead>Professor(a)</TableHead>
                <TableHead className="pr-5">Administração</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {matrix.map((m) => (
                <TableRow key={m.area}>
                  <TableCell className="pl-5 font-medium text-navy">{m.area}</TableCell>
                  <TableCell>
                    <LevelCell level={m.aluno} />
                  </TableCell>
                  <TableCell>
                    <LevelCell level={m.professor} />
                  </TableCell>
                  <TableCell className="pr-5">
                    <LevelCell level={m.admin} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <p className="flex items-start gap-2 px-5 pt-3 text-xs text-muted-foreground">
          <ShieldCheck className="size-4 shrink-0 text-success" aria-hidden />
          As regras são aplicadas no servidor: no Supabase, por políticas de Row Level Security (supabase/migrations/0002_rls.sql); no modo demonstração, pela camada de dados. Esconder um botão nunca é a única proteção.
        </p>
      </Panel>

      <Panel title="Configurações da escola">
        <form
          className="grid gap-5 md:grid-cols-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!invalid) save.mutate(form)
          }}
        >
          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface p-4">
            <Label htmlFor="st-s2s" className="flex-col items-start gap-0.5">
              <span className="text-navy">Mensagens entre alunos</span>
              <span className="text-xs font-normal text-muted-foreground">Permite que colegas da mesma turma conversem. Recomendado desligado para menores.</span>
            </Label>
            <Switch id="st-s2s" checked={form.allowStudentToStudentMessages} onCheckedChange={(v) => set("allowStudentToStudentMessages", v)} />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-xl bg-surface p-4">
            <Label htmlFor="st-goal" className="flex-col items-start gap-0.5">
              <span className="text-navy">Meta coletiva da turma</span>
              <span className="text-xs font-normal text-muted-foreground">Mostra a soma de pontos da turma, sem expor alunos individualmente.</span>
            </Label>
            <Switch id="st-goal" checked={form.showClassCollectiveGoal} onCheckedChange={(v) => set("showClassCollectiveGoal", v)} />
          </div>
          <FormField id="st-term" label="Bimestre atual">
            <Select value={String(form.currentTerm)} onValueChange={(v) => set("currentTerm", Number(v) as SchoolSettings["currentTerm"])}>
              <SelectTrigger id="st-term" className="w-full">
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
          </FormField>
          <FormField id="st-pass" label="Média mínima para aprovação" error={!(form.passingGrade >= 0 && form.passingGrade <= 10) ? "Entre 0 e 10." : undefined}>
            <Input id="st-pass" type="number" step={0.5} min={0} max={10} value={form.passingGrade} onChange={(e) => set("passingGrade", Number(e.target.value))} />
          </FormField>
          <FormField id="st-goalpts" label="Meta coletiva (pontos)" error={!(form.classGoalPoints > 0) ? "Informe um valor positivo." : undefined}>
            <Input id="st-goalpts" type="number" min={1} value={form.classGoalPoints} onChange={(e) => set("classGoalPoints", Number(e.target.value))} />
          </FormField>
          <FormField id="st-upload" label="Tamanho máximo de arquivo (MB)" error={!(form.maxUploadMb >= 1 && form.maxUploadMb <= 10) ? "Entre 1 e 10 MB." : undefined}>
            <Input id="st-upload" type="number" min={1} max={10} value={form.maxUploadMb} onChange={(e) => set("maxUploadMb", Number(e.target.value))} />
          </FormField>
          <div className="md:col-span-2">
            <Button type="submit" disabled={invalid || save.isPending}>
              {save.isPending ? <Loader2 className="animate-spin" /> : <Save />} Salvar configurações
            </Button>
          </div>
        </form>
      </Panel>
    </>
  )
}
