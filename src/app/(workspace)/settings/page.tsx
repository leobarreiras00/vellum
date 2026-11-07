/**
 * Vellum — Definições (/settings)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata } from "next";

import { SettingsClient } from "@/app/(workspace)/settings/SettingsClient";

export const metadata: Metadata = { title: "Definições" };

export default function SettingsPage() {
  return <SettingsClient />;
}
