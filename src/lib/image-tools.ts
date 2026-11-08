/**
 * Vellum — Imagens no navegador: validação, compressão e recorte (Canvas)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Só imagens raster (PNG, JPEG, WEBP, GIF estático). As imagens dos
 * documentos saem em JPEG (ou PNG quando têm transparência), porque o Word
 * não lê WEBP; as fotos de perfil saem em WEBP 256×256.
 * Partes puras (validação de data URLs) são partilhadas com o servidor.
 */

export const DOC_IMAGE_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
export const AVATAR_TYPES = ["image/png", "image/jpeg", "image/webp"] as const;
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const DOC_IMAGE_MAX_SOURCE_BYTES = 12 * 1024 * 1024;
/** Tamanho máximo de uma imagem já comprimida dentro do documento (data URL). */
export const DOC_IMAGE_MAX_DATA_URL = 1_600_000;
export const DOC_IMAGE_MAX_SIDE = 1600;
export const AVATAR_SIDE = 256;

/** `data:image/png|jpeg|webp|gif;base64,…` ou `https://…` — nada mais entra num documento. */
export function isSafeImageSrc(value: unknown, maxLength = DOC_IMAGE_MAX_DATA_URL): value is string {
  if (typeof value !== "string" || value.length > maxLength) return false;
  if (/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*$/.test(value)) return true;
  return /^https:\/\/[^\s"'<>]+$/.test(value) && value.length <= 2048;
}

/** Tamanho em bytes do conteúdo de um data URL base64. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

/** Bytes de um data URL base64 (para o DOCX e para verificar a assinatura no servidor). */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = typeof atob === "function" ? atob(base64) : Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Tipo real pelos bytes iniciais (assinatura), independente do que o ficheiro diz ser. */
export function sniffImageType(bytes: Uint8Array): "image/png" | "image/jpeg" | "image/webp" | "image/gif" | null {
  const b = bytes;
  if (b.length > 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (
    b.length > 12 &&
    b[0] === 0x52 &&
    b[1] === 0x49 &&
    b[2] === 0x46 &&
    b[3] === 0x46 &&
    b[8] === 0x57 &&
    b[9] === 0x45 &&
    b[10] === 0x42 &&
    b[11] === 0x50
  )
    return "image/webp";
  if (b.length > 6 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  return null;
}

/** Erro claro em PT-PT para uma foto de perfil, ou `null` se for aceite. */
export function avatarFileError(file: { type: string; size: number; name?: string }): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) {
    return "Formato não suportado. Use uma imagem PNG, JPEG/JPG ou WEBP.";
  }
  if (file.size > AVATAR_MAX_BYTES) {
    const mb = (file.size / 1024 / 1024).toLocaleString("pt-PT", { maximumFractionDigits: 1 });
    return `O ficheiro tem ${mb} MB. O limite é 2 MB.`;
  }
  return null;
}

/* ==========================================================================
   Só no navegador
   ========================================================================== */

function readAsDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(blob);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("A imagem está danificada ou não é suportada."));
    img.src = src;
  });
}

function hasTransparency(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const step = Math.max(1, Math.floor((w * h) / 40_000));
  const data = ctx.getImageData(0, 0, w, h).data;
  for (let i = 3; i < data.length; i += 4 * step) if (data[i]! < 250) return true;
  return false;
}

export interface CompressedImage {
  src: string;
  width: number;
  height: number;
}

/** Comprime para o documento: lado maior ≤ 1600 px, JPEG 0,84 (PNG se houver transparência). */
export async function compressImage(file: Blob): Promise<CompressedImage> {
  if (!(DOC_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new Error("Formato não suportado. Use PNG, JPEG, WEBP ou GIF.");
  }
  if (file.size > DOC_IMAGE_MAX_SOURCE_BYTES) throw new Error("A imagem tem mais de 12 MB.");
  const img = await loadImage(await readAsDataUrl(file));
  const scale = Math.min(1, DOC_IMAGE_MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * scale));
  const height = Math.max(1, Math.round(img.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("O navegador não permite processar imagens.");
  ctx.drawImage(img, 0, 0, width, height);
  const alpha = file.type !== "image/jpeg" && hasTransparency(ctx, width, height);
  let src = alpha ? canvas.toDataURL("image/png") : canvas.toDataURL("image/jpeg", 0.84);
  // PNG grande demais: tenta JPEG sobre papel creme.
  if (src.length > DOC_IMAGE_MAX_DATA_URL) {
    ctx.globalCompositeOperation = "destination-over";
    ctx.fillStyle = "#fffdf9";
    ctx.fillRect(0, 0, width, height);
    src = canvas.toDataURL("image/jpeg", 0.72);
  }
  if (src.length > DOC_IMAGE_MAX_DATA_URL) throw new Error("A imagem continua grande demais depois de comprimida.");
  return { src, width, height };
}

/**
 * Recorte quadrado para a foto de perfil: `zoom` ≥ 1 e deslocamento (−1…1)
 * relativo à folga disponível. Saída 256×256 em WEBP (JPEG se não houver WEBP).
 */
export async function cropAvatar(src: string, zoom: number, offsetX: number, offsetY: number): Promise<string> {
  const img = await loadImage(src);
  const side = Math.min(img.naturalWidth, img.naturalHeight) / Math.max(1, zoom);
  const maxX = (img.naturalWidth - side) / 2;
  const maxY = (img.naturalHeight - side) / 2;
  const sx = maxX + offsetX * maxX;
  const sy = maxY + offsetY * maxY;
  const canvas = document.createElement("canvas");
  canvas.width = AVATAR_SIDE;
  canvas.height = AVATAR_SIDE;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("O navegador não permite processar imagens.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, sx, sy, side, side, 0, 0, AVATAR_SIDE, AVATAR_SIDE);
  const webp = canvas.toDataURL("image/webp", 0.85);
  return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.88);
}

export { readAsDataUrl };
