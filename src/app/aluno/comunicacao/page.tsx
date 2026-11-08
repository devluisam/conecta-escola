"use client"

import { Suspense } from "react"
import { CommunicationView } from "@/components/features/communication/communication-view"
import { PageSkeleton } from "@/components/shared/states"

export default function StudentCommunicationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CommunicationView />
    </Suspense>
  )
}
