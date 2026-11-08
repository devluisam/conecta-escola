import { Suspense } from "react"
import { RoleArea } from "@/components/layout/role-area"
import { PageSkeleton } from "@/components/shared/states"

/** Área autenticada: o conteúdo depende da sessão no cliente, então a navegação pode aguardar. */
export const instant = false

export default function Layout({ children }: { children: React.ReactNode }) {
  // Suspense externo: rotas dinâmicas ([id]) só conhecem a URL no navegador.
  return (
    <Suspense>
      <RoleArea role="admin">
        <Suspense fallback={<PageSkeleton />}>{children}</Suspense>
      </RoleArea>
    </Suspense>
  )
}
