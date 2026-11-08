/**
 * Vellum — Hub de Projetos (/projects)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import type { Metadata } from "next";

import { ProjectsClient } from "@/app/(workspace)/projects/_components/ProjectsClient";

export const metadata: Metadata = { title: "Projetos" };

export default function ProjectsPage() {
  return <ProjectsClient />;
}
