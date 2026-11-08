/**
 * Vellum — Página individual do Projeto (/projects/[projectId])
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { ProjectDetailClient } from "@/app/(workspace)/projects/_components/ProjectDetailClient";
import { getSession } from "@/lib/auth";
import { findProject } from "@/lib/workspace-store";

interface Props {
  params: Promise<{ projectId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getSession();
  const { projectId } = await params;
  const project = user ? await findProject(user, projectId) : null;
  return { title: project?.name ?? "Projeto" };
}

export default async function ProjectPage({ params, searchParams }: Props) {
  const user = await getSession();
  if (!user) redirect("/login");
  const { projectId } = await params;
  // Verificação no servidor: o projeto tem de pertencer ao workspace do utilizador.
  if (!(await findProject(user, projectId))) notFound();
  const query = await searchParams;
  return <ProjectDetailClient projectId={projectId} autoCreatePage={query.novapagina === "1"} />;
}
