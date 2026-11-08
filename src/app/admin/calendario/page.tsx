"use client"

import { AgendaView } from "@/components/features/agenda/agenda-view"

export default function AdminCalendarPage() {
  return <AgendaView title="Calendário escolar" description="Eventos institucionais, feriados e compromissos de todas as turmas." canCreate />
}
