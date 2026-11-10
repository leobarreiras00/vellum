/**
 * Vellum — Acesso por link partilhado (/shared/[token])
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Abre o documento real (ou o projeto) com o papel concedido pelo link —
 * Leitor, Comentador ou Editor —, mesmo sem sessão, noutro navegador ou numa
 * janela anónima. Links revogados ou expirados deixam de abrir de imediato.
 */
import type { Metadata } from "next";
import { headers } from "next/headers";

import { hasShareAccess } from "@/app/shared/actions";
import { SharedDocumentClient } from "@/components/share/SharedDocumentClient";
import { SharedPasswordGate, SharedUnavailable } from "@/components/share/SharedGates";
import { getSession } from "@/lib/auth";
import { clientIpFrom } from "@/lib/client-ip";
import { MINUTE, rateLimiter } from "@/lib/rate-limit";
import { markShareOpened, readSharedDocument, resolveShareToken } from "@/lib/workspace-store";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Documento partilhado", robots: { index: false, follow: false } };

interface SharedPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ doc?: string | string[] }>;
}

export default async function SharedPage({ params, searchParams }: SharedPageProps) {
  const { token } = await params;
  const { doc } = await searchParams;
  const resolved = await resolveShareToken(token);
  if (!resolved.ok) return <SharedUnavailable reason={resolved.reason} />;

  const { access } = resolved;
  if (!(await hasShareAccess(access.linkId, access.needsPassword))) {
    return <SharedPasswordGate token={token} projectName={access.project.name} ownerName={access.ownerName} />;
  }

  const content = await readSharedDocument(token, typeof doc === "string" ? doc : null);
  if (!content) return <SharedUnavailable reason="not-found" />;
  // O contador de aberturas escreve no repositório inteiro: conta-se uma abertura por
  // visitante e link a cada 30 minutos (refrescar a página não conta), com um teto por origem.
  const ip = clientIpFrom(await headers());
  const counts = !rateLimiter.consume([
    { key: `share-open:ip:${ip}`, max: 60, windowMs: 10 * MINUTE },
    { key: `share-open:link-ip:${access.linkId}:${ip}`, max: 1, windowMs: 30 * MINUTE },
  ]).limited;
  if (counts) await markShareOpened(token);
  const session = await getSession();

  return (
    <SharedDocumentClient
      key={content.document.id}
      token={token}
      access={access}
      initial={content}
      viewerName={session?.name ?? null}
    />
  );
}
