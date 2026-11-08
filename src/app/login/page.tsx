import type { Metadata } from "next"
import { Suspense } from "react"
import { Logo } from "@/components/brand/logo"
import { APP_SLOGAN } from "@/lib/config"
import { LoginArt } from "./login-art"
import { LoginForm } from "./login-form"

export const metadata: Metadata = { title: "Entrar" }

const ods = [
  { n: "4", label: "Educação de qualidade", color: "#C5192D" },
  { n: "9", label: "Inovação e infraestrutura", color: "#FD6925" },
  { n: "10", label: "Redução das desigualdades", color: "#DD1367" },
]

export default function LoginPage() {
  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[1.05fr_1fr]">
      {/* Área institucional (desktop) */}
      <section className="relative hidden overflow-hidden bg-navy text-white lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.18]"
          style={{ backgroundImage: "radial-gradient(#4B9CF0 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          aria-hidden
        />
        <div className="pointer-events-none absolute -right-40 -bottom-48 size-[620px] rounded-full border-[28px] border-brand/25" aria-hidden />
        <div className="relative flex flex-1 flex-col px-12 py-10 xl:px-16">
          <Logo tone="light" />
          <div className="mt-12 grid flex-1 items-center gap-8 xl:grid-cols-[1fr_auto]">
            <div className="max-w-md">
              <span className="mb-5 block h-1 w-14 rounded-full bg-brand" aria-hidden />
              <h1 className="text-5xl leading-[0.95] font-extrabold tracking-tight xl:text-6xl">
                CONECTA
                <br />
                <span className="text-[#4B9CF0]">ESCOLA</span>
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-[#C9D6EA]">
                Tarefas, notas, agenda, materiais e comunicação da escola pública em um só lugar — no computador, no tablet ou no celular.
              </p>
              <p className="mt-6 inline-flex rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[15px] font-medium text-white/90">
                {APP_SLOGAN}
              </p>
            </div>
            <div className="hidden xl:block xl:w-[340px]">
              <LoginArt />
            </div>
          </div>
          <ul className="mt-10 flex flex-wrap gap-3" aria-label="Objetivos de Desenvolvimento Sustentável atendidos">
            {ods.map((o) => (
              <li key={o.n} className="flex items-center gap-2.5 rounded-xl bg-white/[0.05] py-2 pr-4 pl-2 ring-1 ring-white/10">
                <span className="grid size-9 place-items-center rounded-lg text-sm font-extrabold" style={{ backgroundColor: o.color }}>
                  {o.n}
                </span>
                <span className="text-[13px] leading-tight text-white/85">
                  ODS {o.n}
                  <br />
                  {o.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Formulário */}
      <section className="flex flex-col px-5 py-8 sm:px-10">
        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center">
          <div className="mb-8 flex flex-col items-center text-center lg:hidden">
            <div className="mb-5 rounded-2xl bg-navy p-4">
              <Logo tone="light" />
            </div>
            <p className="text-sm text-muted-foreground">{APP_SLOGAN}</p>
          </div>
          <div className="mb-7">
            <h2 className="text-[28px] font-bold tracking-tight text-navy">Bem-vindo(a)!</h2>
            <p className="mt-1.5 text-[15px] text-muted-foreground">Entre com seu e-mail ou matrícula para acessar o portal.</p>
          </div>
          <Suspense>
            <LoginForm />
          </Suspense>
        </div>
        <p className="mx-auto mt-8 max-w-[420px] text-center text-xs leading-relaxed text-muted-foreground">
          Seus dados são tratados conforme a LGPD.{" "}
          <a href="/privacidade" className="font-medium text-brand underline-offset-2 hover:underline">
            Política de privacidade
          </a>
        </p>
      </section>
    </div>
  )
}
