// Valida as migrations e as políticas de segurança (RLS) num PostgreSQL descartável via Docker.
// Uso: npm run db:test   (requer Docker em execução)
import { execFileSync, spawnSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { join } from "node:path"

const NAME = "conecta-escola-rls-test"
const root = join(import.meta.dirname, "..", "supabase")
const files = ["tests/00_supabase_shim.sql", "migrations/0001_schema.sql", "migrations/0002_rls.sql", "migrations/0003_functions.sql", "tests/10_rls_test.sql"]
const docker = (args, input) => spawnSync("docker", args, { input, encoding: "utf8" })

try {
  execFileSync("docker", ["info"], { stdio: "ignore" })
} catch {
  console.error("Docker não está em execução. Abra o Docker Desktop e tente novamente.")
  process.exit(1)
}
docker(["rm", "-f", NAME])
docker(["run", "-d", "--name", NAME, "-e", "POSTGRES_PASSWORD=test", "postgres:16-alpine"])
let ready = false
for (let i = 0; i < 60 && !ready; i++) {
  ready = docker(["exec", NAME, "pg_isready", "-U", "postgres"]).status === 0
  if (!ready) await new Promise((r) => setTimeout(r, 1000))
}
let ok = ready
for (const f of files) {
  if (!ok) break
  const r = docker(["exec", "-i", NAME, "psql", "-U", "postgres", "-v", "ON_ERROR_STOP=1", "-q"], readFileSync(join(root, f), "utf8"))
  process.stdout.write(`\n== ${f}\n` + (r.stdout || "") + (r.stderr || "").replace(/psql:<stdin>:\d+: /g, ""))
  ok = r.status === 0
}
docker(["rm", "-f", NAME])
console.log(ok ? "\n✔ Migrations e RLS validados." : "\n✖ Falha na validação do banco.")
process.exit(ok ? 0 : 1)
