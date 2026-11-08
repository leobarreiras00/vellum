/**
 * Vellum — Documento no Editor Rico (/projects/[projectId]/documents/[docId])
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Verifica no servidor a sessão e que o documento pertence ao workspace de
 * quem pede (notFound caso contrário); o papel efetivo decide no cliente o
 * modo (edição, revisão ou leitura) e no servidor cada gravação (assertCan).
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { DocumentEditorClient } from "@/app/(workspace)/projects/_components/DocumentEditorClient";
import { getSession } from "@/lib/auth";
import { findDocument } from "@/lib/workspace-store";

interface Props {
  params: Promise<{ projectId: string; docId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getSession();
  const { projectId, docId } = await params;
  const doc = user ? await findDocument(user, projectId, docId) : null;
  return { title: doc?.title ?? "Documento" };
}

export default async function DocumentPage({ params, searchParams }: Props) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { projectId, docId } = await params;
  if (!(await findDocument(user, projectId, docId))) notFound();
  const query = await searchParams;
  return <DocumentEditorClient key={docId} projectId={projectId} documentId={docId} isNew={query.editar === "1"} />;
}
