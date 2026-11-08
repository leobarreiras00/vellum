/**
 * Vellum — Gerador externo de ilustrações (opcional)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Por omissão o Vellum usa só o gerador local (src/lib/illustrations.ts), sem
 * chaves nem custos. Para ligar um serviço externo de imagens, definem-se
 * variáveis de ambiente (nunca no código):
 *   ILLUSTRATION_API_URL  endereço que recebe POST JSON
 *                         { prompt, style, styleLabel, collection, collectionLabel, width, height }
 *                         e responde com uma imagem (image/png|jpeg|webp) ou JSON { "image": "data:image/…" }
 *   ILLUSTRATION_API_KEY  (opcional) enviado como «Authorization: Bearer …»
 *   ILLUSTRATION_PROVIDER (opcional) nome mostrado no ecrã, ex.: «Serviço do atelier»
 * Se o serviço falhar, o cliente recorre ao gerador local.
 */
import "server-only";

import { readEnv } from "@/lib/app-url";
import { dataUrlToBytes, sniffImageType } from "@/lib/image-tools";
import {
  COVER_UPLOAD_MAX_DATA_URL,
  collectionLabel,
  styleLabel,
  type CoverSpec,
  type IllustrationCollection,
  type IllustrationStyle,
} from "@/lib/illustrations";

export interface IllustrationProviderStatus {
  external: boolean;
  label: string;
}

export function illustrationProviderStatus(): IllustrationProviderStatus {
  const url = readEnv("ILLUSTRATION_API_URL");
  if (!url) return { external: false, label: "Gerador local (sem IA externa)" };
  return { external: true, label: readEnv("ILLUSTRATION_PROVIDER") ?? "Serviço externo de ilustração" };
}

export type ExternalIllustrationResult =
  | { external: false; label: string }
  | { external: true; label: string; spec: Extract<CoverSpec, { type: "upload" }> }
  | { external: true; label: string; error: string };

export async function generateExternalIllustration(input: {
  prompt: string;
  style: IllustrationStyle;
  collection: IllustrationCollection;
}): Promise<ExternalIllustrationResult> {
  const status = illustrationProviderStatus();
  const url = readEnv("ILLUSTRATION_API_URL");
  if (!url) return { external: false, label: status.label };
  const key = readEnv("ILLUSTRATION_API_KEY");
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(key ? { Authorization: `Bearer ${key}` } : {}) },
      body: JSON.stringify({
        prompt: input.prompt,
        style: input.style,
        styleLabel: styleLabel(input.style),
        collection: input.collection,
        collectionLabel: collectionLabel(input.collection),
        width: 1280,
        height: 800,
      }),
      signal: AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`O serviço respondeu ${response.status}.`);
    const type = response.headers.get("content-type") ?? "";
    let src: string;
    if (type.startsWith("image/")) {
      const bytes = new Uint8Array(await response.arrayBuffer());
      const real = sniffImageType(bytes);
      if (!real || real === "image/gif") throw new Error("O serviço não devolveu uma imagem PNG, JPEG ou WEBP.");
      src = `data:${real};base64,${Buffer.from(bytes).toString("base64")}`;
    } else {
      const json = (await response.json()) as { image?: unknown };
      if (typeof json.image !== "string" || !json.image.startsWith("data:image/")) {
        throw new Error("Resposta sem imagem.");
      }
      src = json.image;
      const real = sniffImageType(dataUrlToBytes(src));
      if (!real || real === "image/gif" || !src.startsWith(`data:${real};base64,`)) throw new Error("Imagem inválida.");
    }
    if (src.length > COVER_UPLOAD_MAX_DATA_URL) throw new Error("A imagem gerada é demasiado grande.");
    return { external: true, label: status.label, spec: { type: "upload", src } };
  } catch (error) {
    console.error("[vellum] Gerador externo de ilustrações falhou.", error);
    return {
      external: true,
      label: status.label,
      error: "O serviço externo não respondeu. Foi usado o gerador local.",
    };
  }
}
