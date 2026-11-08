"use client"

import { BookOpen, Download, ExternalLink, Eye, FileText, Link2, Lock, Presentation, Search, Trash2, Upload, Video } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { ConfirmAction } from "@/components/shared/confirm-button"
import { PageHeader } from "@/components/shared/page-header"
import { SubjectTag } from "@/components/shared/badges"
import { EmptyState, ErrorState, GridSkeleton } from "@/components/shared/states"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import type { MaterialView } from "@/lib/data/repository"
import { downloadFile, resolveFileUrl } from "@/lib/files"
import { fmtBytes, fmtDate, materialTypeLabel } from "@/lib/format"
import { useRepoMutation, useRepoQuery } from "@/lib/queries"
import type { FileRef, MaterialType } from "@/lib/types"
import { MaterialFormDialog } from "./material-form"

/** URL exibível do arquivo (assina na hora quando vem do Storage privado). */
function useFileUrl(file: FileRef | null | undefined) {
  const { data } = useQuery({ queryKey: ["file-url", file?.url], queryFn: () => resolveFileUrl(file!), enabled: Boolean(file), staleTime: 60_000 })
  return data ?? null
}

const typeIcon: Record<MaterialType, typeof FileText> = { pdf: FileText, livro: BookOpen, apresentacao: Presentation, video: Video, link: Link2 }

export function LibraryView({ title, description, canPublish = false }: { title: string; description: string; canPublish?: boolean }) {
  const params = useSearchParams()
  const router = useRouter()
  const { data, isLoading, error, refetch } = useRepoQuery(["materials"], (r) => r.listMaterials())
  const [q, setQ] = useState("")
  const [subject, setSubject] = useState("all")
  const [type, setType] = useState("all")
  const [publishing, setPublishing] = useState(false)
  const remove = useRepoMutation((r, id: string) => r.deleteMaterial(id), { success: "Material removido da biblioteca." })

  const openId = params.get("abrir")
  const viewing = data?.find((m) => m.id === openId) ?? null
  const viewUrl = useFileUrl(viewing?.file)
  const setViewing = (m: MaterialView | null) => {
    const url = new URL(window.location.href)
    if (m) url.searchParams.set("abrir", m.id)
    else url.searchParams.delete("abrir")
    router.replace(url.pathname + url.search, { scroll: false })
  }

  const subjects = useMemo(() => [...new Map((data ?? []).map((m) => [m.subjectId, m.subject])).values()].sort((a, b) => a.name.localeCompare(b.name)), [data])
  const list = (data ?? []).filter(
    (m) =>
      (subject === "all" || m.subjectId === subject) &&
      (type === "all" || m.type === type) &&
      (!q || `${m.title} ${m.description}`.toLowerCase().includes(q.toLowerCase())),
  )

  return (
    <>
      <PageHeader
        title={title}
        description={description}
        actions={
          canPublish && (
            <Button onClick={() => setPublishing(true)}>
              <Upload /> Publicar material
            </Button>
          )
        }
      />
      <div className="mb-5 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por título ou assunto" className="pl-9" aria-label="Buscar materiais" />
        </div>
        <Select value={subject} onValueChange={setSubject}>
          <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por disciplina">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as disciplinas</SelectItem>
            {subjects.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={type} onValueChange={setType}>
          <SelectTrigger className="w-full sm:w-44" aria-label="Filtrar por tipo">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {(Object.keys(materialTypeLabel) as MaterialType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {materialTypeLabel[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <GridSkeleton />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : list.length === 0 ? (
        <EmptyState icon={BookOpen} title="Nenhum material encontrado" description={data?.length ? "Tente outra busca ou filtro." : "Os materiais publicados pelos professores aparecerão aqui."} />
      ) : (
        <>
          <p className="mb-3 text-sm text-muted-foreground" aria-live="polite">
            {list.length} {list.length === 1 ? "material" : "materiais"}
          </p>
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {list.map((m) => {
              const Icon = typeIcon[m.type]
              return (
                <li key={m.id} className="flex gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/[0.06] transition-shadow hover:shadow-[0_10px_28px_-16px_rgba(7,29,58,0.35)]">
                  <div
                    className="relative grid h-[104px] w-[78px] shrink-0 place-items-center rounded-md text-white shadow-md"
                    style={{ background: `linear-gradient(160deg, ${m.subject.color}, #071D3A)` }}
                    aria-hidden
                  >
                    <Icon className="size-8 opacity-90" />
                    <span className="absolute bottom-1.5 text-[9px] font-bold tracking-wider uppercase opacity-80">{m.subject.code}</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <SubjectTag subject={m.subject} className="self-start" />
                    <p className="mt-1.5 line-clamp-2 font-semibold text-navy">{m.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{m.description}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {materialTypeLabel[m.type]} · {m.author.name} · {fmtDate(m.createdAt)}
                      {m.className && ` · ${m.className}`}
                    </p>
                    <div className="mt-auto flex flex-wrap gap-1.5 pt-2.5">
                      <Button size="sm" variant="outline" className="border-brand/40 text-brand hover:text-brand" onClick={() => setViewing(m)}>
                        <Eye /> {m.url && !m.file ? "Abrir" : "Visualizar"}
                      </Button>
                      {m.file && m.downloadable && (
                        <Button size="sm" variant="ghost" onClick={() => downloadFile(m.file!)} aria-label={`Baixar ${m.title}`}>
                          <Download /> Baixar
                        </Button>
                      )}
                      {m.canDelete && (
                        <ConfirmAction
                          trigger={
                            <Button size="icon-sm" variant="ghost" className="ml-auto text-destructive hover:text-destructive" aria-label={`Excluir ${m.title}`}>
                              <Trash2 />
                            </Button>
                          }
                          title="Excluir material?"
                          description={`"${m.title}" deixará de aparecer para os alunos.`}
                          confirmLabel="Excluir"
                          onConfirm={() => remove.mutate(m.id)}
                        />
                      )}
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
        </>
      )}

      <Dialog open={Boolean(viewing)} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent
          className="flex max-h-[94dvh] flex-col sm:max-w-3xl"
          // Sem isto o foco cai dentro do iframe e o Esc deixa de fechar o visualizador.
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            ;(e.currentTarget as HTMLElement).focus()
          }}
        >
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle className="pr-6 text-navy">{viewing.title}</DialogTitle>
                <DialogDescription>
                  {viewing.subject.name} · {materialTypeLabel[viewing.type]}
                  {viewing.file && ` · ${fmtBytes(viewing.file.size)}`}
                </DialogDescription>
              </DialogHeader>
              {viewing.file ? (
                viewing.file.mime.startsWith("image/") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewUrl ?? undefined} alt={viewing.title} className="max-h-[65dvh] w-full rounded-lg object-contain" />
                ) : viewing.file.mime === "application/pdf" ? (
                  <iframe src={viewUrl ?? undefined} title={viewing.title} className="h-[65dvh] w-full rounded-lg border bg-muted" />
                ) : (
                  <EmptyState icon={FileText} title="Pré-visualização indisponível" description="Baixe o arquivo para abrir no seu dispositivo." />
                )
              ) : (
                <div className="rounded-xl bg-surface p-6 text-center">
                  <Link2 className="mx-auto size-8 text-brand" aria-hidden />
                  <p className="mt-2 text-sm text-navy">{viewing.description}</p>
                  <p className="mt-1 text-xs break-all text-muted-foreground">{viewing.url}</p>
                </div>
              )}
              <div className="flex flex-wrap items-center justify-end gap-2">
                {viewing.file && !viewing.downloadable && (
                  <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Lock className="size-3.5" /> Download não autorizado pelo professor
                  </span>
                )}
                {viewing.url && (
                  <Button asChild>
                    <a href={viewing.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink /> Abrir site externo
                    </a>
                  </Button>
                )}
                {viewing.file && viewing.downloadable && (
                  <Button onClick={() => downloadFile(viewing.file!)}>
                    <Download /> Baixar arquivo
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {canPublish && publishing && <MaterialFormDialog onClose={() => setPublishing(false)} />}
    </>
  )
}
