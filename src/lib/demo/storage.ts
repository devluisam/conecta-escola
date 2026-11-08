import { DEMO_SESSION_COOKIE } from "@/lib/config"
import type { Role } from "@/lib/types"
import { createSeed, DEMO_DB_VERSION, type DemoDB } from "./seed"

export interface DemoStorage {
  load(): DemoDB
  save(db: DemoDB): void
  reset(): DemoDB
}

export interface DemoSessionStore {
  get(): { userId: string; role: Role } | null
  set(userId: string, role: Role, remember: boolean): void
  clear(): void
}

const DB_KEY = "conecta-escola:demo-db"

/** Banco do modo demo guardado no localStorage do navegador (isolado por dispositivo). */
export function browserStorage(): DemoStorage {
  let cache: DemoDB | null = null
  return {
    load() {
      if (cache) return cache
      try {
        const raw = window.localStorage.getItem(DB_KEY)
        if (raw) {
          const parsed = JSON.parse(raw) as DemoDB
          if (parsed.version === DEMO_DB_VERSION) return (cache = parsed)
        }
      } catch {
        /* dados corrompidos ou storage bloqueado: recomeça do seed */
      }
      return this.reset()
    },
    save(db) {
      cache = db
      try {
        window.localStorage.setItem(DB_KEY, JSON.stringify(db))
      } catch {
        throw new Error("Não foi possível salvar no navegador (armazenamento cheio). Use arquivos menores.")
      }
    },
    reset() {
      const db = createSeed()
      cache = db
      try {
        window.localStorage.setItem(DB_KEY, JSON.stringify(db))
      } catch {
        /* segue em memória */
      }
      return db
    },
  }
}

/** Armazenamento em memória — usado nos testes automatizados. */
export function memoryStorage(seed: DemoDB = createSeed()): DemoStorage {
  let db = structuredClone(seed)
  return {
    load: () => db,
    save: (next) => {
      db = next
    },
    reset: () => (db = structuredClone(seed)),
  }
}

/** Sessão demo em cookie (lido também pelo proxy para redirecionar por perfil). */
export function cookieSession(): DemoSessionStore {
  return {
    get() {
      const match = document.cookie.split("; ").find((c) => c.startsWith(`${DEMO_SESSION_COOKIE}=`))
      if (!match) return null
      const [userId, role] = decodeURIComponent(match.split("=")[1]).split(".")
      if (!userId || !["aluno", "professor", "admin"].includes(role)) return null
      return { userId, role: role as Role }
    },
    set(userId, role, remember) {
      const maxAge = remember ? `; max-age=${60 * 60 * 24 * 30}` : ""
      const secure = location.protocol === "https:" ? "; secure" : ""
      document.cookie = `${DEMO_SESSION_COOKIE}=${encodeURIComponent(`${userId}.${role}`)}; path=/; samesite=lax${maxAge}${secure}`
    },
    clear() {
      document.cookie = `${DEMO_SESSION_COOKIE}=; path=/; max-age=0; samesite=lax`
    },
  }
}

export function memorySession(): DemoSessionStore {
  let current: { userId: string; role: Role } | null = null
  return {
    get: () => current,
    set: (userId, role) => {
      current = { userId, role }
    },
    clear: () => {
      current = null
    },
  }
}
