"use client"

import { APP_MODE } from "@/lib/config"
import { createDemoRepository } from "@/lib/demo/demo-repository"
import { browserStorage, cookieSession } from "@/lib/demo/storage"
import type { Repository } from "./repository"
import { createSupabaseRepository } from "./supabase-repository"

let instance: Repository | null = null

/** Repositório do navegador: demo (localStorage) ou Supabase, conforme o modo. */
export function getRepository(): Repository {
  if (instance) return instance
  instance =
    APP_MODE === "supabase"
      ? createSupabaseRepository()
      : createDemoRepository({ storage: browserStorage(), session: cookieSession(), latency: 220 })
  return instance
}
