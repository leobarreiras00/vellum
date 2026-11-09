/**
 * Vellum — Verificação de saúde (deploy, Docker HEALTHCHECK, balanceadores)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * 200 quando o repositório responde (no PostgreSQL, uma consulta à revisão);
 * 503 caso contrário. Não expõe dados nem mensagens de erro.
 */
import { NextResponse } from "next/server";

import { getStoreBackend } from "@/lib/store";
import { APP_VERSION } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const backend = await getStoreBackend();
    await backend.read();
    return NextResponse.json({ status: "ok", version: APP_VERSION }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[vellum] Verificação de saúde falhou.", error);
    return NextResponse.json(
      { status: "unavailable", version: APP_VERSION },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
