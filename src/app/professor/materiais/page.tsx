"use client"

import { Suspense } from "react"
import { LibraryView } from "@/components/features/library/library-view"
import { GridSkeleton } from "@/components/shared/states"

export default function TeacherMaterialsPage() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <LibraryView title="Materiais didáticos" description="Publique arquivos e links para as suas turmas e controle quem pode baixar." canPublish />
    </Suspense>
  )
}
