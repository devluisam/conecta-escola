import Link from "next/link"
import { LogoMark } from "@/components/brand/logo"

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-surface px-5">
      <div className="max-w-sm text-center">
        <LogoMark className="mx-auto size-16" />
        <p className="mt-6 text-sm font-semibold text-brand">Erro 404</p>
        <h1 className="mt-1 text-2xl font-bold text-navy">Página não encontrada</h1>
        <p className="mt-2 text-muted-foreground">O endereço pode ter mudado ou você não tem acesso a esta área.</p>
        <Link href="/" className="mt-6 inline-flex h-10 items-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:bg-brand-600">
          Voltar ao início
        </Link>
      </div>
    </div>
  )
}
