"use client"

import { Suspense } from "react"
import { CommunicationView } from "@/components/features/communication/communication-view"
import { PageSkeleton } from "@/components/shared/states"

export default function AdminCommunicationPage() {
  return (
    <Suspense fallback={<PageSkeleton />}>
      <CommunicationView canPost />
    </Suspense>
  )
}
