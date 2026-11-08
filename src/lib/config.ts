/**
 * Modo de execução.
 * - "demo": dados fictícios no navegador, perfis de demonstração liberados.
 * - "supabase": autenticação e banco reais; o acesso de demonstração não existe.
 *
 * O modo só é "supabase" quando as duas variáveis públicas estão definidas e
 * NEXT_PUBLIC_APP_MODE não força "demo". Sem credenciais, cai no demo — nunca
 * o contrário (o demo jamais é ativado por cookie ou parâmetro de URL).
 */
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
const forced = process.env.NEXT_PUBLIC_APP_MODE

export const hasSupabaseCredentials = Boolean(supabaseUrl && supabaseAnonKey)

export const APP_MODE: "demo" | "supabase" =
  forced === "demo" || !hasSupabaseCredentials ? "demo" : "supabase"

export const IS_DEMO = APP_MODE === "demo"

export const supabaseConfig = { url: supabaseUrl, anonKey: supabaseAnonKey }

export const APP_NAME = "Conecta Escola"
export const APP_SLOGAN = "Tecnologia que conecta. Educação que transforma."

export const DEMO_SESSION_COOKIE = "ce_demo_session"
