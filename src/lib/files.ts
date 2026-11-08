import type { FileRef } from "@/lib/types"

export const ACCEPTED_FILES = ".pdf,.doc,.docx,.odt,.txt,.png,.jpg,.jpeg,.ppt,.pptx"

/** Lê um arquivo local como data URL. No modo Supabase, o repositório o envia ao Storage. */
export function readFileAsRef(file: File, maxMb: number): Promise<FileRef> {
  return new Promise((resolve, reject) => {
    if (file.size > maxMb * 1024 * 1024) {
      reject(new Error(`O arquivo "${file.name}" tem mais de ${maxMb} MB.`))
      return
    }
    const reader = new FileReader()
    reader.onload = () => resolve({ name: file.name, size: file.size, mime: file.type || "application/octet-stream", url: String(reader.result) })
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."))
    reader.readAsDataURL(file)
  })
}

/** Arquivos do Storage privado ("storage:bucket/caminho") viram URLs assinadas de curta duração. */
export async function resolveFileUrl(file: FileRef): Promise<string> {
  if (!file.url.startsWith("storage:")) return file.url
  const [bucket, ...rest] = file.url.slice("storage:".length).split("/")
  const { getSupabase } = await import("@/lib/supabase/client")
  const { data, error } = await getSupabase().storage.from(bucket).createSignedUrl(rest.join("/"), 120, { download: false })
  if (error || !data) throw new Error("Você não tem acesso a este arquivo ou ele foi removido.")
  return data.signedUrl
}

export async function downloadFile(file: FileRef) {
  const a = document.createElement("a")
  a.href = await resolveFileUrl(file)
  a.download = file.name
  a.rel = "noopener"
  document.body.appendChild(a)
  a.click()
  a.remove()
}
