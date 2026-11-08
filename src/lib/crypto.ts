/** Hash de senha com PBKDF2-SHA256 (WebCrypto) — usado apenas no modo demo.
 * No modo Supabase as senhas ficam com o Supabase Auth (bcrypt), nunca nas tabelas. */

const ITERATIONS = 120_000

function toHex(buffer: ArrayBuffer | Uint8Array) {
  return Array.from(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

function fromHex(hex: string) {
  const out = new Uint8Array(hex.length / 2)
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  return out
}

export function randomSalt() {
  return toHex(crypto.getRandomValues(new Uint8Array(16)))
}

export async function hashPassword(password: string, saltHex: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, [
    "deriveBits",
  ])
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: fromHex(saltHex), iterations: ITERATIONS },
    key,
    256,
  )
  return toHex(bits)
}

export async function verifyPassword(password: string, saltHex: string, expectedHex: string) {
  const actual = await hashPassword(password, saltHex)
  if (actual.length !== expectedHex.length) return false
  let diff = 0
  for (let i = 0; i < actual.length; i++) diff |= actual.charCodeAt(i) ^ expectedHex.charCodeAt(i)
  return diff === 0
}

export function uid(prefix = "") {
  const rand = crypto.getRandomValues(new Uint8Array(8))
  return `${prefix}${toHex(rand)}`
}
