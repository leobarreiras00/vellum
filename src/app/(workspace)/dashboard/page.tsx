/**
 * Vellum — Dashboard do Workspace (/dashboard)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Ponto de chegada após o login: saudação, esforço do dia face à meta,
 * páginas recentes, notas fixadas e o estado dos projetos.
 */
import type { Metadata } from "next";

import { DashboardClient } from "@/app/(workspace)/dashboard/_components/DashboardClient";

export const metadata: Metadata = { title: "Dashboard" };

function greeting(): string {
  const hour = Number(
    new Intl.DateTimeFormat("pt-PT", { hour: "numeric", hour12: false, timeZone: "Europe/Lisbon" }).format(new Date()),
  );
  if (hour >= 6 && hour < 13) return "Bom dia";
  if (hour >= 13 && hour < 20) return "Boa tarde";
  return "Boa noite";
}

function todayLabel(): string {
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Lisbon",
  }).format(new Date());
}

export default function DashboardPage() {
  return <DashboardClient greeting={greeting()} today={todayLabel()} />;
}
