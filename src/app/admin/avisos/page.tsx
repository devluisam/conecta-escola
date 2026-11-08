"use client"

import { AnnouncementsPanel } from "@/components/features/communication/announcements-panel"
import { PageHeader } from "@/components/shared/page-header"

export default function AdminAnnouncementsPage() {
  return (
    <>
      <PageHeader title="Avisos institucionais" description="Publique comunicados para toda a escola, para um público ou para uma turma." />
      <AnnouncementsPanel canPost />
    </>
  )
}
