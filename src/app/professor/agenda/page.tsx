"use client"

import { AgendaView } from "@/components/features/agenda/agenda-view"

export default function TeacherAgendaPage() {
  return <AgendaView title="Agenda de aulas" description="Aulas, provas e prazos das suas turmas. Clique em um dia para agendar." canCreate />
}
