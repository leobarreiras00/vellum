/**
 * Vellum — Página de documento (/projects/[projectId]/pages/[pageId])
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocumentClient } from "@/app/(workspace)/projects/_components/DocumentClient";
import { getSession } from "@/lib/auth";
import { findDocument } from "@/lib/workspace-store";

interface Props {
  params: Promise<{ projectId: string; pageId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getSession();
  const { projectId, pageId } = await params;
  const doc = user ? await findDocument(user, projectId, pageId) : null;
  return { title: doc?.title ?? "Página" };
}

export default async function DocumentPage({ params, searchParams }: Props) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { projectId, pageId } = await params;
  if (!(await findDocument(user, projectId, pageId))) notFound();
  const query = await searchParams;
  return <DocumentClient projectId={projectId} documentId={pageId} startEditing={query.editar === "1"} />;
}
