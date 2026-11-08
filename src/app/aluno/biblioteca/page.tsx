"use client"

import { Suspense } from "react"
import { LibraryView } from "@/components/features/library/library-view"
import { GridSkeleton } from "@/components/shared/states"

export default function StudentLibraryPage() {
  return (
    <Suspense fallback={<GridSkeleton />}>
      <LibraryView title="Biblioteca digital" description="Livros, resumos, slides e links indicados pelos seus professores." />
    </Suspense>
  )
}
