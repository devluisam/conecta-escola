"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, CheckCircle2, KeyRound, Loader2 } from "lucide-react"
import Link from "next/link"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Logo } from "@/components/brand/logo"
import { FormField } from "@/components/shared/form-field"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { IS_DEMO } from "@/lib/config"

const schema = z
  .object({
    next: z.string().min(8, "Use pelo menos 8 caracteres.").regex(/[A-Za-z]/, "Inclua letras.").regex(/\d/, "Inclua números."),
    confirm: z.string(),
  })
  .refine((v) => v.next === v.confirm, { path: ["confirm"], message: "As senhas não coincidem." })

/** Destino do link de recuperação enviado pelo Supabase Auth. */
export default function ResetPasswordPage() {
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">(IS_DEMO ? "invalid" : "checking")
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { next: "", confirm: "" } })

  useEffect(() => {
    if (IS_DEMO) return
    let alive = true
    import("@/lib/supabase/client").then(async ({ getSupabase }) => {
      const sb = getSupabase()
      const code = new URLSearchParams(location.search).get("code")
      if (code) await sb.auth.exchangeCodeForSession(code).catch(() => null)
      const { data } = await sb.auth.getSession()
      if (alive) setReady(data.session ? "ok" : "invalid")
    })
    return () => {
      alive = false
    }
  }, [])

  const onSubmit = form.handleSubmit(async ({ next }) => {
    setError(null)
    const { getSupabase } = await import("@/lib/supabase/client")
    const sb = getSupabase()
    const { error: err } = await sb.auth.updateUser({ password: next })
    if (err) return setError("Não foi possível alterar a senha. Solicite um novo link.")
    await sb.auth.signOut()
    setDone(true)
  })
  const e = form.formState.errors

  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-5 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-[0_20px_60px_-30px_rgba(7,29,58,0.35)] ring-1 ring-foreground/5 sm:p-9">
        <Logo />
        {done ? (
          <div className="mt-8 text-center" role="status">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 text-xl font-bold text-navy">Senha alterada</h1>
            <p className="mt-2 text-sm text-muted-foreground">Entre novamente com a nova senha.</p>
          </div>
        ) : ready === "checking" ? (
          <p className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Validando o link…
          </p>
        ) : ready === "invalid" ? (
          <div className="mt-8">
            <h1 className="text-xl font-bold text-navy">Link inválido ou expirado</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {IS_DEMO ? "No modo demonstração não há envio de e-mails." : "Solicite um novo link de redefinição."}
            </p>
            <Button asChild className="mt-5">
              <Link href="/esqueci-senha">Solicitar novo link</Link>
            </Button>
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-navy">Defina uma nova senha</h1>
              <p className="mt-1 text-sm text-muted-foreground">Mínimo de 8 caracteres, com letras e números.</p>
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <FormField id="rs-next" label="Nova senha" error={e.next?.message}>
              <Input id="rs-next" type="password" autoComplete="new-password" className="h-11" {...form.register("next")} aria-invalid={Boolean(e.next)} />
            </FormField>
            <FormField id="rs-confirm" label="Confirmar nova senha" error={e.confirm?.message}>
              <Input id="rs-confirm" type="password" autoComplete="new-password" className="h-11" {...form.register("confirm")} aria-invalid={Boolean(e.confirm)} />
            </FormField>
            <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <KeyRound />} Salvar nova senha
            </Button>
          </form>
        )}
        <Link href="/login" className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline">
          <ArrowLeft className="size-4" /> Voltar para o login
        </Link>
      </div>
    </div>
  )
}
