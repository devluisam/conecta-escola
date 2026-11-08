import { createServerClient } from "@supabase/ssr"
import { createClient } from "@supabase/supabase-js"
import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { z } from "zod"
import { APP_MODE, supabaseConfig } from "@/lib/config"

/**
 * Cadastro de usuários pela administração (modo Supabase).
 * Criar um login no Supabase Auth exige a SERVICE ROLE KEY — que só existe no
 * servidor (variável SUPABASE_SERVICE_ROLE_KEY, nunca com prefixo NEXT_PUBLIC_).
 */
const schema = z.object({
  role: z.enum(["aluno", "professor", "admin"]),
  name: z.string().trim().min(3).max(100),
  email: z.email(),
  matricula: z.string().trim().min(4).max(20).regex(/^[\w-]+$/),
  password: z.string().min(8).regex(/\d/).regex(/[A-Za-z]/),
  classId: z.string().uuid().nullish(),
  birthDate: z.string().nullish(),
  guardianName: z.string().max(100).nullish(),
})

const fail = (error: string, status: number) => NextResponse.json({ error }, { status })

export async function POST(request: Request) {
  if (APP_MODE !== "supabase") return fail("Disponível apenas no modo Supabase.", 400)
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return fail("SUPABASE_SERVICE_ROLE_KEY não configurada no servidor.", 500)

  // 1) Quem chama precisa ser admin ativo (sessão validada no Supabase Auth).
  const store = await cookies()
  const session = createServerClient(supabaseConfig.url, supabaseConfig.anonKey, {
    cookies: { getAll: () => store.getAll(), setAll: () => {} },
  })
  const { data: auth } = await session.auth.getUser()
  if (!auth.user) return fail("Sessão expirada.", 401)
  const { data: caller } = await session.from("profiles").select("role, active, school_id").eq("id", auth.user.id).single()
  if (!caller || caller.role !== "admin" || !caller.active) return fail("Apenas a administração pode cadastrar usuários.", 403)

  // 2) Validação dos dados.
  const parsed = schema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return fail("Dados inválidos. Verifique os campos e a senha (mínimo 8 caracteres, com letras e números).", 422)
  const input = parsed.data
  if (input.role === "aluno" && !input.classId) return fail("Selecione a turma do aluno.", 422)

  // 3) Cria login + perfil (+ matrícula) com a service role.
  const admin = createClient(supabaseConfig.url, serviceKey, { auth: { persistSession: false } })
  const created = await admin.auth.admin.createUser({ email: input.email.toLowerCase(), password: input.password, email_confirm: true })
  if (created.error || !created.data.user) return fail(created.error?.message ?? "Não foi possível criar o login.", 400)
  const id = created.data.user.id
  const profile = {
    id,
    school_id: caller.school_id,
    role: input.role,
    name: input.name,
    email: input.email.toLowerCase(),
    matricula: input.matricula,
    birth_date: input.birthDate || null,
    guardian_name: input.guardianName || null,
  }
  const { error: profileError } = await admin.from("profiles").insert(profile)
  if (!profileError && input.role === "aluno") {
    const { error } = await admin.from("enrollments").insert({ student_id: id, class_id: input.classId })
    if (error) return fail(error.message, 400)
  }
  if (profileError) {
    await admin.auth.admin.deleteUser(id) // não deixa login órfão
    return fail(profileError.code === "23505" ? "E-mail ou matrícula já cadastrados." : profileError.message, 400)
  }
  return NextResponse.json({ user: { ...profile, photoDataUrl: null, active: true } }, { status: 201 })
}
