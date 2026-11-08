"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { Camera, KeyRound, Loader2, Lock, Save, ShieldCheck, Trash2 } from "lucide-react"
import { useRef, useState } from "react"
import { Controller, useForm } from "react-hook-form"
import { toast } from "sonner"
import { z } from "zod"
import { useUser } from "@/components/auth/auth-provider"
import { UserAvatar } from "@/components/shared/badges"
import { FormField } from "@/components/shared/form-field"
import { PageHeader } from "@/components/shared/page-header"
import { Panel } from "@/components/shared/panel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { ProfilePatch } from "@/lib/data/repository"
import { fmtDate, roleLabel } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"

const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(100),
  phone: z.union([z.literal(""), z.string().regex(/^[\d\s()+-]{10,20}$/, "Telefone inválido.")]),
  bio: z.string().max(280, "Máximo de 280 caracteres."),
  pronoun: z.enum(["ela", "ele", "neutro", "nao"]),
})

const passwordSchema = z
  .object({
    current: z.string().min(1, "Informe a senha atual."),
    next: z
      .string()
      .min(8, "Use pelo menos 8 caracteres.")
      .regex(/[A-Za-z]/, "Inclua letras.")
      .regex(/\d/, "Inclua números."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "As senhas não coincidem." })
  .refine((v) => v.next !== v.current, { path: ["next"], message: "A nova senha deve ser diferente da atual." })

/** Reduz a foto para no máximo 256px antes de salvar (menos dados, mais privacidade). */
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Escolha uma imagem."))
    const img = new Image()
    img.onload = () => {
      const size = 256
      const canvas = document.createElement("canvas")
      canvas.width = canvas.height = size
      const ctx = canvas.getContext("2d")!
      const s = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size)
      URL.revokeObjectURL(img.src)
      resolve(canvas.toDataURL("image/jpeg", 0.85))
    }
    img.onerror = () => reject(new Error("Não foi possível ler a imagem."))
    img.src = URL.createObjectURL(file)
  })
}

export function ProfileView() {
  const user = useUser()
  const ctx = useRepoQuery(["context"], (r) => r.getMyContext())
  const photoInput = useRef<HTMLInputElement>(null)
  const isStudent = user.role === "aluno"

  const update = useRepoMutation((r, patch: ProfilePatch) => r.updateMyProfile(patch), { success: "Perfil atualizado." })
  const changePassword = useRepoMutation((r, v: { current: string; next: string }) => r.changePassword(v.current, v.next), {
    success: "Senha alterada com sucesso.",
    onSuccess: () => pwd.reset(),
  })

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: user.name, phone: user.phone ?? "", bio: user.bio ?? "", pronoun: user.pronoun ?? "nao" },
  })
  const pwd = useForm<z.infer<typeof passwordSchema>>({ resolver: zodResolver(passwordSchema), defaultValues: { current: "", next: "", confirm: "" } })
  const [uploading, setUploading] = useState(false)

  const info: [string, string][] = [
    ["Matrícula", user.matricula],
    ["Perfil", roleLabel[user.role]],
    ["E-mail", user.email],
    ...(isStudent
      ? ([
          ["Turma", ctx.data?.schoolClass?.name ?? "—"],
          ["Série", ctx.data?.schoolClass?.series ?? "—"],
          ["Turno", ctx.data?.schoolClass?.shift ?? "—"],
          ["Responsável", user.guardianName ?? "—"],
        ] as [string, string][])
      : []),
    ["Escola", ctx.data?.school.name ?? "—"],
    ["Cadastro desde", fmtDate(user.createdAt)],
  ]

  const e = form.formState.errors
  const pe = pwd.formState.errors

  return (
    <>
      <PageHeader title="Meu perfil" description="Seus dados pessoais e configurações de acesso." />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-5">
          <Panel>
            <div className="flex flex-col items-center text-center">
              <div className="relative">
                <UserAvatar user={user} size="xl" className="ring-4 ring-brand-50" />
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  aria-label="Escolher foto de perfil"
                  onChange={async (ev) => {
                    const file = ev.target.files?.[0]
                    ev.target.value = ""
                    if (!file) return
                    setUploading(true)
                    try {
                      update.mutate({ photoDataUrl: await resizeImage(file) })
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Imagem inválida.")
                    } finally {
                      setUploading(false)
                    }
                  }}
                />
                <Button
                  size="icon"
                  className="absolute right-0 bottom-0 rounded-full ring-4 ring-white"
                  onClick={() => photoInput.current?.click()}
                  disabled={uploading || update.isPending}
                  aria-label="Alterar foto de perfil"
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <Camera />}
                </Button>
              </div>
              <h2 className="mt-4 text-lg font-bold text-navy">{user.name}</h2>
              <p className="text-sm text-muted-foreground">
                {roleLabel[user.role]}
                {ctx.data?.schoolClass && ` · ${ctx.data.schoolClass.name}`}
              </p>
              {user.photoDataUrl && (
                <Button variant="ghost" size="sm" className="mt-2 text-destructive hover:text-destructive" onClick={() => update.mutate({ photoDataUrl: null })}>
                  <Trash2 /> Remover foto
                </Button>
              )}
            </div>
            <dl className="mt-5 divide-y border-t text-sm">
              {info.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="min-w-0 truncate text-right font-medium text-navy">{v}</dd>
                </div>
              ))}
            </dl>
          </Panel>
          <div className="flex gap-3 rounded-xl bg-brand-50 p-4 text-sm text-secondary-foreground">
            <ShieldCheck className="size-5 shrink-0 text-brand" aria-hidden />
            <p>
              Seus dados são usados apenas para fins escolares, conforme a LGPD. Dados cadastrais (nome, matrícula e turma) são mantidos pela secretaria.{" "}
              <a href="/privacidade" className="font-semibold underline-offset-2 hover:underline">
                Saiba mais
              </a>
            </p>
          </div>
        </div>

        <div className="min-w-0 space-y-5">
          <Panel title="Dados pessoais">
            <form
              className="grid gap-4 sm:grid-cols-2"
              noValidate
              onSubmit={form.handleSubmit((v) =>
                update.mutate({
                  ...(isStudent ? {} : { name: v.name }),
                  phone: v.phone || null,
                  bio: v.bio || null,
                  pronoun: v.pronoun === "nao" ? null : v.pronoun,
                }),
              )}
            >
              <FormField id="pf-name" label="Nome completo" error={e.name?.message} hint={isStudent ? "Para corrigir o nome, procure a secretaria." : undefined} className="sm:col-span-2">
                <div className="relative">
                  <Input id="pf-name" disabled={isStudent} {...form.register("name")} aria-invalid={Boolean(e.name)} />
                  {isStudent && <Lock className="absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />}
                </div>
              </FormField>
              <FormField id="pf-phone" label="Telefone para contato" error={e.phone?.message}>
                <Input id="pf-phone" type="tel" inputMode="tel" placeholder="(92) 90000-0000" {...form.register("phone")} aria-invalid={Boolean(e.phone)} />
              </FormField>
              <FormField id="pf-pronoun" label="Como prefere ser tratado(a)?">
                <Controller
                  control={form.control}
                  name="pronoun"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id="pf-pronoun" className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nao">Prefiro não informar</SelectItem>
                        <SelectItem value="ela">Ela / dela</SelectItem>
                        <SelectItem value="ele">Ele / dele</SelectItem>
                        <SelectItem value="neutro">Linguagem neutra</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>
              <FormField id="pf-bio" label="Sobre mim" error={e.bio?.message} className="sm:col-span-2">
                <Textarea id="pf-bio" rows={3} maxLength={280} placeholder="Conte um pouco sobre seus interesses" {...form.register("bio")} />
              </FormField>
              <div className="sm:col-span-2">
                <Button type="submit" disabled={update.isPending || !form.formState.isDirty}>
                  {update.isPending ? <Loader2 className="animate-spin" /> : <Save />} Salvar alterações
                </Button>
              </div>
            </form>
          </Panel>

          <Panel title="Segurança">
            <form className="grid gap-4 sm:grid-cols-3" noValidate onSubmit={pwd.handleSubmit((v) => changePassword.mutate({ current: v.current, next: v.next }))}>
              <FormField id="pw-current" label="Senha atual" error={pe.current?.message}>
                <Input id="pw-current" type="password" autoComplete="current-password" {...pwd.register("current")} aria-invalid={Boolean(pe.current)} />
              </FormField>
              <FormField id="pw-next" label="Nova senha" error={pe.next?.message} hint="Mínimo 8 caracteres, com letras e números">
                <Input id="pw-next" type="password" autoComplete="new-password" {...pwd.register("next")} aria-invalid={Boolean(pe.next)} />
              </FormField>
              <FormField id="pw-confirm" label="Confirmar nova senha" error={pe.confirm?.message}>
                <Input id="pw-confirm" type="password" autoComplete="new-password" {...pwd.register("confirm")} aria-invalid={Boolean(pe.confirm)} />
              </FormField>
              <div className="sm:col-span-3">
                <Button type="submit" variant="outline" disabled={changePassword.isPending}>
                  {changePassword.isPending ? <Loader2 className="animate-spin" /> : <KeyRound />} Alterar senha
                </Button>
              </div>
            </form>
          </Panel>
        </div>
      </div>
    </>
  )
}
