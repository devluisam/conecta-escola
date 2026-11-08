"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import { AlertCircle, ArrowRight, Eye, EyeOff, GraduationCap, Loader2, PlayCircle, School, ShieldCheck } from "lucide-react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { homeFor } from "@/components/auth/auth-provider"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IS_DEMO } from "@/lib/config"
import { getRepository } from "@/lib/data"
import { DEMO_ACCOUNTS, DEMO_PASSWORD_HINT } from "@/lib/demo/seed"
import { errorMessage } from "@/lib/queries"
import type { Role } from "@/lib/types"
import { cn } from "@/lib/utils"

const schema = z.object({
  identifier: z
    .string()
    .trim()
    .min(1, "Informe seu e-mail ou matrícula.")
    .refine((v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || /^[\w-]{4,}$/.test(v), "Digite um e-mail válido ou sua matrícula."),
  password: z.string().min(1, "Informe sua senha.").max(128, "Senha muito longa."),
  remember: z.boolean(),
})
type FormValues = z.infer<typeof schema>

/** Só permite redirecionar para rotas internas (evita open redirect). */
function safeNext(next: string | null, role: Role) {
  if (next && next.startsWith(`/${role}`) && !next.startsWith("//")) return next
  return homeFor(role)
}

const demoProfiles: { role: Role; title: string; name: string; desc: string; Icon: typeof GraduationCap; tone: string }[] = [
  { role: "aluno", title: "Aluno(a)", name: "Maria Oliveira · 9º Ano A", desc: "Tarefas, notas, agenda, biblioteca e desafios.", Icon: GraduationCap, tone: "bg-brand-50 text-brand" },
  { role: "professor", title: "Professor(a)", name: "Carlos Mendes · Matemática e Ciências", desc: "Atividades, correções, notas, materiais e turmas.", Icon: School, tone: "bg-success-50 text-success" },
  { role: "admin", title: "Administração", name: "Patrícia Nogueira · Coordenação", desc: "Usuários, turmas, vínculos, calendário e permissões.", Icon: ShieldCheck, tone: "bg-violet-50 text-violet" },
]

export function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const qc = useQueryClient()
  const [showPassword, setShowPassword] = useState(false)
  const [serverError, setServerError] = useState<string | null>(null)
  const [demoLoading, setDemoLoading] = useState<Role | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "", password: "", remember: true },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    setServerError(null)
    try {
      const user = await getRepository().signIn(values.identifier, values.password, values.remember)
      qc.clear()
      router.replace(safeNext(params.get("next"), user.role))
    } catch (err) {
      setServerError(errorMessage(err))
      form.setFocus("password")
    }
  })

  const enterDemo = async (role: Role) => {
    setDemoLoading(role)
    setServerError(null)
    try {
      await getRepository().signInDemo(role)
      qc.clear()
      router.replace(homeFor(role))
    } catch (err) {
      setServerError(errorMessage(err))
      setDemoLoading(null)
    }
  }

  return (
    <div>
      <form onSubmit={onSubmit} noValidate className="space-y-5">
        {serverError && (
          <div role="alert" className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
            <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
            {serverError}
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="identifier" className="text-navy">
            E-mail ou matrícula
          </Label>
          <Input
            id="identifier"
            autoComplete="username"
            inputMode="email"
            placeholder="seu.email@escola.br ou 2025090101"
            className="h-12 text-[15px]"
            aria-invalid={Boolean(errors.identifier)}
            aria-describedby={errors.identifier ? "identifier-error" : undefined}
            {...form.register("identifier")}
          />
          {errors.identifier && (
            <p id="identifier-error" className="text-[13px] text-destructive">
              {errors.identifier.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password" className="text-navy">
              Senha
            </Label>
            <Link href="/esqueci-senha" className="text-[13px] font-semibold text-brand underline-offset-2 hover:underline">
              Esqueci minha senha
            </Link>
          </div>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Digite sua senha"
              className="h-12 pr-12 text-[15px]"
              aria-invalid={Boolean(errors.password)}
              aria-describedby={errors.password ? "password-error" : undefined}
              {...form.register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute top-1/2 right-1.5 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-navy focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
              aria-pressed={showPassword}
            >
              {showPassword ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
            </button>
          </div>
          {errors.password && (
            <p id="password-error" className="text-[13px] text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <Checkbox
            id="remember"
            checked={form.watch("remember")}
            onCheckedChange={(v) => form.setValue("remember", v === true)}
          />
          <Label htmlFor="remember" className="font-normal text-muted-foreground">
            Lembrar de mim neste dispositivo
          </Label>
        </div>
        <Button type="submit" size="lg" className="h-12 w-full text-[15px] font-semibold" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="animate-spin" /> : null}
          {isSubmitting ? "Entrando…" : "Entrar"}
          {!isSubmitting && <ArrowRight data-icon="inline-end" />}
        </Button>
      </form>

      {IS_DEMO && (
        <div className="mt-7">
          <div className="relative mb-5 text-center text-xs font-medium text-muted-foreground">
            <span className="absolute inset-x-0 top-1/2 h-px bg-border" aria-hidden />
            <span className="relative bg-white px-3">Apresentação do seminário</span>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="lg" className="h-12 w-full border-brand/30 bg-brand-50 text-[15px] font-semibold text-brand hover:bg-brand-50/70 hover:text-brand">
                <PlayCircle /> Acessar demonstração
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="text-navy">Escolha um perfil de demonstração</DialogTitle>
                <DialogDescription>
                  Ambiente com dados 100% fictícios, salvos apenas neste navegador. Este acesso não existe no modo de produção.
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-2.5">
                {demoProfiles.map(({ role, title, name, desc, Icon, tone }) => (
                  <button
                    key={role}
                    onClick={() => enterDemo(role)}
                    disabled={demoLoading !== null}
                    className="group flex items-center gap-3.5 rounded-xl border bg-white p-3.5 text-left transition-all hover:border-brand/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-brand focus-visible:outline-none disabled:opacity-60"
                  >
                    <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", tone)}>
                      <Icon className="size-6" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold text-navy">{title}</span>
                      <span className="block truncate text-[13px] font-medium text-foreground/80">{name}</span>
                      <span className="block text-xs text-muted-foreground">{desc}</span>
                    </span>
                    {demoLoading === role ? (
                      <Loader2 className="size-5 animate-spin text-brand" />
                    ) : (
                      <ArrowRight className="size-5 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-brand" />
                    )}
                  </button>
                ))}
              </div>
              <p className="rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
                Também é possível entrar pelo formulário com <strong className="text-navy">{DEMO_ACCOUNTS.aluno.email}</strong> (ou a
                matrícula <strong className="text-navy">{DEMO_ACCOUNTS.aluno.matricula}</strong>) e a senha{" "}
                <strong className="text-navy">{DEMO_PASSWORD_HINT}</strong>.
              </p>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  )
}
