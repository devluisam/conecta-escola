"use client"

import { useMutation, useQuery, useQueryClient, type QueryKey } from "@tanstack/react-query"
import { toast } from "sonner"
import { getRepository } from "@/lib/data"
import { AppError, type Repository } from "@/lib/data/repository"

export function errorMessage(err: unknown) {
  if (err instanceof AppError) return err.message
  if (err instanceof Error && err.message) return err.message
  return "Algo deu errado. Tente novamente."
}

export function useRepoQuery<T>(
  key: QueryKey,
  fn: (repo: Repository) => Promise<T>,
  options?: { enabled?: boolean; refetchInterval?: number },
) {
  return useQuery({ queryKey: key, queryFn: () => fn(getRepository()), enabled: options?.enabled, refetchInterval: options?.refetchInterval })
}

/**
 * Mutação com feedback padronizado: toast de sucesso/erro e atualização
 * de todas as consultas (os dados de uma tela costumam afetar outras).
 */
export function useRepoMutation<A, T>(
  fn: (repo: Repository, args: A) => Promise<T>,
  options?: { success?: string | ((result: T) => string); silent?: boolean; onSuccess?: (result: T) => void },
) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (args: A) => fn(getRepository(), args),
    onSuccess: (result) => {
      qc.invalidateQueries()
      const msg = typeof options?.success === "function" ? options.success(result) : options?.success
      if (msg && !options?.silent) toast.success(msg)
      options?.onSuccess?.(result)
    },
    onError: (err) => {
      if (!options?.silent) toast.error(errorMessage(err))
    },
  })
}
