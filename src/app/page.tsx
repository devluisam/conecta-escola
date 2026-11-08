import { redirect } from "next/navigation"

/** O proxy já redireciona por perfil; isto é só o fallback. */
export default function Home() {
  redirect("/login")
}
