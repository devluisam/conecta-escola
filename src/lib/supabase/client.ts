"use client"

import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { supabaseConfig } from "@/lib/config"

let client: SupabaseClient | null = null

/** Cliente do navegador (sessão em cookies, compartilhada com o proxy). */
export function getSupabase() {
  if (!client) client = createBrowserClient(supabaseConfig.url, supabaseConfig.anonKey)
  return client
}
