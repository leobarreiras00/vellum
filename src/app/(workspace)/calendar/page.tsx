/**
 * Vellum — Calendário (/calendar)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Calendário Built-in Personalizável (Fase 4): Vista Calendário (mês/semana)
 * e Vista Agenda com Notas. `?dia=AAAA-MM-DD` abre a agenda nesse dia (ligação
 * usada pelo Centro de Notificações e pelo dashboard).
 */
import type { Metadata } from "next";

import { CalendarWorkspace } from "@/components/calendar/CalendarWorkspace";

export const metadata: Metadata = { title: "Calendário" };

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ dia?: string | string[] }> }) {
  const { dia } = await searchParams;
  const day = typeof dia === "string" && /^\d{4}-\d{2}-\d{2}$/.test(dia) ? dia : undefined;
  return <CalendarWorkspace initialDay={day} />;
}
