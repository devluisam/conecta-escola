"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Pencil, Search, UserPlus, Users } from "lucide-react"
import { useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { z } from "zod"
import { useUser } from "@/components/auth/auth-provider"
import { UserAvatar } from "@/components/shared/badges"
import { FormField } from "@/components/shared/form-field"
import { PageHeader } from "@/components/shared/page-header"
import { EmptyState, ErrorState, ListSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type { UserInput, UserPatch, UserView } from "@/lib/data/repository"
import { roleLabel } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { Role } from "@/lib/types"

const NONE = "__nenhuma"
const schema = z
  .object({
    role: z.enum(["aluno", "professor", "admin"]),
    name: z.string().trim().min(3, "Informe o nome completo.").max(100),
    email: z.email("E-mail inválido."),
    matricula: z.string().trim().min(4, "Mínimo de 4 caracteres.").max(20).regex(/^[\w-]+$/, "Use letras, números ou hífen."),
    classId: z.string(),
    birthDate: z.string(),
    guardianName: z.string().max(100),
    password: z.string(),
  })
  .superRefine((v, ctx) => {
    if (v.role === "aluno" && v.classId === NONE) ctx.addIssue({ code: "custom", path: ["classId"], message: "Selecione a turma." })
  })
type Values = z.infer<typeof schema>

function UserDialog({ user, defaultRole, onClose }: { user: UserView | null; defaultRole: Role; onClose: () => void }) {
  const classes = useRepoQuery(["classes"], (r) => r.listClasses())
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      role: user?.role ?? defaultRole,
      name: user?.name ?? "",
      email: user?.email ?? "",
      matricula: user?.matricula ?? "",
      classId: user?.classId ?? NONE,
      birthDate: user?.birthDate ?? "",
      guardianName: user?.guardianName ?? "",
      password: "",
    },
  })
  const role = form.watch("role")
  const create = useRepoMutation((r, input: UserInput) => r.createUser(input), { success: "Usuário cadastrado.", onSuccess: onClose })
  const update = useRepoMutation((r, patch: UserPatch) => r.updateUser(user!.id, patch), { success: "Cadastro atualizado.", onSuccess: onClose })

  const onSubmit = form.handleSubmit((v) => {
    const classId = v.classId === NONE ? null : v.classId
    if (user) {
      update.mutate({ name: v.name, email: v.email, matricula: v.matricula, classId: user.role === "aluno" ? classId : undefined, birthDate: v.birthDate || null, guardianName: v.guardianName || null })
      return
    }
    if (v.password.length < 8 || !/\d/.test(v.password) || !/[A-Za-z]/.test(v.password)) {
      form.setError("password", { message: "Senha inicial: mínimo 8 caracteres, com letras e números." })
      return
    }
    create.mutate({ role: v.role, name: v.name, email: v.email, matricula: v.matricula, password: v.password, classId, birthDate: v.birthDate || null, guardianName: v.guardianName || null })
  })
  const e = form.formState.errors
  const pending = create.isPending || update.isPending

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-navy">{user ? "Editar cadastro" : "Cadastrar usuário"}</DialogTitle>
          <DialogDescription>Colete apenas os dados necessários. Para alunos menores, informe o responsável legal (LGPD, art. 14).</DialogDescription>
        </DialogHeader>
        <form id="user-form" onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2" noValidate>
          {!user && (
            <FormField id="us-role" label="Perfil" className="sm:col-span-2">
              <Controller
                control={form.control}
                name="role"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="us-role" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="aluno">Aluno(a)</SelectItem>
                      <SelectItem value="professor">Professor(a)</SelectItem>
                      <SelectItem value="admin">Administração</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </FormField>
          )}
          <FormField id="us-name" label="Nome completo" error={e.name?.message} className="sm:col-span-2" required>
            <Input id="us-name" {...form.register("name")} aria-invalid={Boolean(e.name)} />
          </FormField>
          <FormField id="us-email" label="E-mail" error={e.email?.message} required>
            <Input id="us-email" type="email" {...form.register("email")} aria-invalid={Boolean(e.email)} />
          </FormField>
          <FormField id="us-mat" label={role === "aluno" ? "Matrícula" : "Registro funcional"} error={e.matricula?.message} required>
            <Input id="us-mat" {...form.register("matricula")} aria-invalid={Boolean(e.matricula)} />
          </FormField>
          {role === "aluno" && (
            <>
              <FormField id="us-class" label="Turma" error={e.classId?.message} required>
                <Controller
                  control={form.control}
                  name="classId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="us-class" className="w-full" aria-invalid={Boolean(e.classId)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>Selecione</SelectItem>
                        {(classes.data ?? []).map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="us-birth" label="Data de nascimento">
                <Input id="us-birth" type="date" {...form.register("birthDate")} />
              </FormField>
              <FormField id="us-guardian" label="Responsável legal" className="sm:col-span-2">
                <Input id="us-guardian" {...form.register("guardianName")} />
              </FormField>
            </>
          )}
          {!user && (
            <FormField id="us-pass" label="Senha inicial" error={e.password?.message} hint="O usuário poderá trocá-la em Meu Perfil." className="sm:col-span-2" required>
              <Input id="us-pass" type="password" autoComplete="new-password" {...form.register("password")} aria-invalid={Boolean(e.password)} />
            </FormField>
          )}
        </form>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" form="user-form" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default function AdminUsersPage() {
  const me = useUser()
  const [tab, setTab] = useState<Role | "todos">("aluno")
  const [q, setQ] = useState("")
  const [editing, setEditing] = useState<UserView | null | "new">(null)
  const { data, isLoading, error, refetch } = useRepoQuery(["users"], (r) => r.listUsers())
  const toggle = useRepoMutation((r, v: { id: string; active: boolean }) => r.setUserActive(v.id, v.active), {
    success: "Acesso atualizado.",
  })
  const list = (data ?? []).filter(
    (u) => (tab === "todos" || u.role === tab) && `${u.name} ${u.email} ${u.matricula}`.toLowerCase().includes(q.toLowerCase()),
  )
  const count = (r: Role) => (data ?? []).filter((u) => u.role === r).length

  return (
    <>
      <PageHeader
        title="Usuários"
        description="Cadastre alunos, professores e equipe gestora, e controle o acesso à plataforma."
        actions={
          <Button onClick={() => setEditing("new")}>
            <UserPlus /> Cadastrar usuário
          </Button>
        }
      />
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Tabs value={tab} onValueChange={(v) => setTab(v as Role | "todos")}>
          <TabsList className="h-10 bg-white ring-1 ring-foreground/[0.06]">
            <TabsTrigger value="aluno" className="px-3">Alunos ({count("aluno")})</TabsTrigger>
            <TabsTrigger value="professor" className="px-3">Professores ({count("professor")})</TabsTrigger>
            <TabsTrigger value="admin" className="px-3">Gestão ({count("admin")})</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nome, e-mail ou matrícula" className="pl-9 md:w-72" aria-label="Buscar usuário" />
        </div>
      </div>
      <div className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/[0.06]">
        {isLoading ? (
          <ListSkeleton className="p-4" />
        ) : error ? (
          <div className="p-4">
            <ErrorState error={error} onRetry={refetch} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={Users} title="Nenhum usuário encontrado" className="border-0" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-5">Nome</TableHead>
                  <TableHead>Matrícula</TableHead>
                  <TableHead>{tab === "aluno" ? "Turma" : tab === "professor" ? "Vínculos" : "Perfil"}</TableHead>
                  <TableHead>Acesso</TableHead>
                  <TableHead className="pr-5 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((u) => (
                  <TableRow key={u.id} className={u.active ? "" : "opacity-60"}>
                    <TableCell className="pl-5">
                      <span className="flex items-center gap-2.5">
                        <UserAvatar user={u} size="sm" />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy">{u.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">{u.matricula}</TableCell>
                    <TableCell className="text-navy">
                      {u.role === "aluno" ? (u.className ?? "Sem turma") : u.role === "professor" ? `${u.assignmentsCount} turma(s)/disciplina(s)` : roleLabel[u.role]}
                    </TableCell>
                    <TableCell>
                      <label className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Switch
                          checked={u.active}
                          disabled={u.id === me.id || toggle.isPending}
                          onCheckedChange={(v) => toggle.mutate({ id: u.id, active: v })}
                          aria-label={`${u.active ? "Desativar" : "Ativar"} acesso de ${u.name}`}
                        />
                        {u.active ? "Ativo" : "Inativo"}
                      </label>
                    </TableCell>
                    <TableCell className="pr-5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => setEditing(u)} aria-label={`Editar ${u.name}`}>
                        <Pencil /> Editar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
      {editing && <UserDialog user={editing === "new" ? null : editing} defaultRole={tab === "todos" ? "aluno" : tab} onClose={() => setEditing(null)} />}
    </>
  )
}
