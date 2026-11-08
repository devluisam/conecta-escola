"use client"

import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, CheckCircle2, Loader2, Mail } from "lucide-react"
import Link from "next/link"
import { useState } from "react"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { Logo } from "@/components/brand/logo"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { IS_DEMO } from "@/lib/config"
import { getRepository } from "@/lib/data"
import { errorMessage } from "@/lib/queries"

const schema = z.object({ identifier: z.string().trim().min(1, "Informe seu e-mail ou matrícula.") })

export default function ForgotPasswordPage() {
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { identifier: "" } })
  const onSubmit = form.handleSubmit(async ({ identifier }) => {
    setError(null)
    try {
      await getRepository().requestPasswordReset(identifier)
      setSent(true)
    } catch (err) {
      setError(errorMessage(err))
    }
  })

  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-5 py-10">
      <div className="w-full max-w-md rounded-2xl bg-white p-7 shadow-[0_20px_60px_-30px_rgba(7,29,58,0.35)] ring-1 ring-foreground/5 sm:p-9">
        <Logo />
        {sent ? (
          <div className="mt-8 text-center" role="status">
            <CheckCircle2 className="mx-auto size-12 text-success" />
            <h1 className="mt-4 text-xl font-bold text-navy">Verifique seu e-mail</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Se o cadastro existir, enviaremos as instruções para redefinir a senha. Por segurança, não informamos se o e-mail está cadastrado.
            </p>
            {IS_DEMO && (
              <p className="mt-4 rounded-lg bg-reward-50 px-3 py-2 text-xs text-reward-700">
                Modo demonstração: nenhum e-mail é enviado. No modo Supabase, o envio é feito pelo Supabase Auth.
              </p>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
            <div>
              <h1 className="text-xl font-bold text-navy">Esqueceu sua senha?</h1>
              <p className="mt-1 text-sm text-muted-foreground">Informe seu e-mail ou matrícula e enviaremos um link de redefinição.</p>
            </div>
            {error && (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
                {error}
              </p>
            )}
            <div className="space-y-2">
              <Label htmlFor="identifier">E-mail ou matrícula</Label>
              <Input id="identifier" className="h-11" autoComplete="username" aria-invalid={Boolean(form.formState.errors.identifier)} {...form.register("identifier")} />
              {form.formState.errors.identifier && <p className="text-[13px] text-destructive">{form.formState.errors.identifier.message}</p>}
            </div>
            <Button type="submit" size="lg" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? <Loader2 className="animate-spin" /> : <Mail />} Enviar instruções
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
