/**
 * Vellum — Mural de Notas Rápidas (/notes)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata } from "next";

import { NotesClient } from "@/app/(workspace)/notes/_components/NotesClient";

export const metadata: Metadata = { title: "Notas Rápidas" };

interface Props {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function NotesPage({ searchParams }: Props) {
  const query = await searchParams;
  const one = (value: string | string[] | undefined) => (typeof value === "string" ? value : null);
  return (
    <NotesClient
      startComposing={query.nova === "1"}
      initialProject={one(query.projeto)}
      focusNoteId={one(query.nota)}
    />
  );
}
