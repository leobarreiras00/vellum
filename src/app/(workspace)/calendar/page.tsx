/**
 * Vellum — Calendário (/calendar) · pré-visualização
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * O calendário completo (FullCalendar, eventos, legendas, lembretes) é da
 * Fase 4. Esta vista mensal mostra já o esforço diário e as páginas editadas.
 */
import type { Metadata } from "next";

import { CalendarClient } from "@/app/(workspace)/calendar/CalendarClient";

export const metadata: Metadata = { title: "Calendário" };

export default function CalendarPage() {
  return <CalendarClient />;
}
