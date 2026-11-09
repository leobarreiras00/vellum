/**
 * Vellum — PDF paginado no servidor (Módulo 6 · Exportação Fiel)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Recebe o HTML já paginado pela pré-visualização (folhas A4, fontes e SVGs
 * Mermaid embutidos) e imprime-o com o Chromium do Playwright:
 * `page.pdf({ preferCSSPageSize: true, printBackground: true })`, para que o
 * PDF tenha exatamente as folhas que se viram no ecrã.
 *
 * Segurança (security-rbac-guard.md): sessão obrigatória → Zod → assertCan
 * "document:export" com o papel efetivo no projeto. O HTML é tratado como não
 * confiável: JavaScript desligado e todos os pedidos de rede bloqueados (só
 * data: URLs), sem acesso a ficheiros nem à rede interna.
 *
 * Quando o Chromium não está instalado no servidor, responde 503 e o cliente
 * usa a impressão do navegador («Guardar como PDF») com as mesmas folhas.
 */
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getSession } from "@/lib/auth";
import { clientIpFrom } from "@/lib/client-ip";
import { exportFilename } from "@/lib/exporters/types";
import { MINUTE, rateLimiter } from "@/lib/rate-limit";
import { FORBIDDEN_MESSAGE, ForbiddenError } from "@/lib/rbac";
import { Semaphore, SemaphoreFullError } from "@/lib/semaphore";
import { NotFoundError, getExportBundle } from "@/lib/workspace-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_HTML_BYTES = 30_000_000;
/** Páginas do Chromium em simultâneo (cada uma pode usar centenas de MB) e pedidos à espera. */
const PDF_CONCURRENCY = 2;
const PDF_QUEUE = 4;
const globalForSemaphore = globalThis as unknown as { vellumPdfSemaphore?: Semaphore };
const pdfSlots = (globalForSemaphore.vellumPdfSemaphore ??= new Semaphore(PDF_CONCURRENCY, PDF_QUEUE));

/** Lê o corpo até ao limite, sem confiar no `Content-Length` (pode faltar ou mentir). */
async function readBodyLimited(request: Request, maxBytes: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf8");
}

const bodySchema = z.object({
  documentId: z.string().min(1).max(64),
  html: z
    .string()
    .min(20)
    .max(MAX_HTML_BYTES)
    .refine((html) => /^<!DOCTYPE html>/i.test(html.trimStart()), "HTML inválido."),
});

type Browser = import("playwright-core").Browser;
const globalForPdf = globalThis as unknown as { vellumPdfBrowser?: Promise<Browser> | null };

/**
 * `--no-sandbox`: o Railway não concede os privilégios que o sandbox do Chromium
 * pede dentro do contentor. Controlos que compensam: o processo corre sem root
 * (Dockerfile, USER vellum), cada PDF abre um contexto novo com JavaScript e rede
 * desligados (só data: URLs), o HTML vem de um utilizador autenticado com
 * permissão de exportar, e a concorrência está limitada (`pdfSlots`).
 */
async function browser(): Promise<Browser> {
  globalForPdf.vellumPdfBrowser ??= import("playwright-core")
    .then(({ chromium }) => chromium.launch({ headless: true, args: ["--no-sandbox", "--disable-dev-shm-usage"] }))
    .catch((error: unknown) => {
      globalForPdf.vellumPdfBrowser = null;
      throw error;
    });
  const instance = await globalForPdf.vellumPdfBrowser;
  if (!instance.isConnected()) {
    globalForPdf.vellumPdfBrowser = null;
    return browser();
  }
  return instance;
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "A sua sessão terminou. Entre de novo." }, { status: 401 });

  const limit = rateLimiter.consume([
    { key: `pdf:user:${user.userId}`, max: 20, windowMs: 10 * MINUTE },
    { key: `pdf:ip:${clientIpFrom(await headers())}`, max: 60, windowMs: 10 * MINUTE },
  ]);
  if (limit.limited) {
    return NextResponse.json(
      { error: "Demasiados PDFs seguidos. Aguarde um momento e tente de novo." },
      { status: 429, headers: { "Retry-After": String(Math.ceil(limit.retryAfterMs / 1000)) } },
    );
  }

  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_HTML_BYTES + 10_000) {
    return NextResponse.json({ error: "O documento é demasiado grande para gerar o PDF." }, { status: 413 });
  }
  const raw = await readBodyLimited(request, MAX_HTML_BYTES + 10_000);
  if (raw === null) {
    return NextResponse.json({ error: "O documento é demasiado grande para gerar o PDF." }, { status: 413 });
  }

  let input: z.infer<typeof bodySchema>;
  try {
    input = bodySchema.parse(JSON.parse(raw));
  } catch {
    return NextResponse.json({ error: "Pedido de exportação inválido." }, { status: 400 });
  }

  let title: string;
  try {
    title = (await getExportBundle(user, input.documentId)).title;
  } catch (error) {
    if (error instanceof ForbiddenError) return NextResponse.json({ error: FORBIDDEN_MESSAGE }, { status: 403 });
    if (error instanceof NotFoundError) return NextResponse.json({ error: error.message }, { status: 404 });
    throw error;
  }

  try {
    return await pdfSlots.run(() => renderPdf(input.html, title));
  } catch (error) {
    if (error instanceof SemaphoreFullError) {
      return NextResponse.json(
        { error: "Há muitos PDFs a ser gerados. Tente de novo dentro de instantes." },
        { status: 429, headers: { "Retry-After": "10" } },
      );
    }
    if (error instanceof PdfUnavailableError) {
      return NextResponse.json(
        { error: "O gerador de PDF do servidor não está disponível.", fallback: "print" },
        { status: 503 },
      );
    }
    console.error("[vellum] Falha ao gerar o PDF.", error);
    return NextResponse.json({ error: "Não foi possível gerar o PDF. Tente de novo." }, { status: 500 });
  }
}

class PdfUnavailableError extends Error {}

async function renderPdf(html: string, title: string): Promise<NextResponse> {
  let instance: Browser;
  try {
    instance = await browser();
  } catch (error) {
    console.error("[vellum] Chromium indisponível para gerar PDF no servidor.", error);
    throw new PdfUnavailableError();
  }

  const context = await instance.newContext({ javaScriptEnabled: false, offline: true });
  try {
    const page = await context.newPage();
    await page.route("**/*", (route) =>
      route.request().url().startsWith("data:") ? route.continue() : route.abort("blockedbyclient"),
    );
    await page.setContent(html, { waitUntil: "load", timeout: 30_000 });
    await page.emulateMedia({ media: "print" });
    const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true, tagged: true, outline: true });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${exportFilename(title, ".pdf")}"`,
        "Cache-Control": "no-store",
      },
    });
  } finally {
    await context.close();
  }
}
