/**
 * Vellum — Raiz "/"
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Redireciona para /dashboard com sessão válida, ou para /login sem ela.
 * A página de verificação do Design System vive agora em /design-system.
 */
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth";

export default async function RootPage() {
  const session = await getSession();
  redirect(session ? "/dashboard" : "/login");
}
