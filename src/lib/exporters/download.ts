/**
 * Vellum — Descarregar ficheiros gerados no cliente
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadText(text: string, filename: string, type: string) {
  downloadBlob(new Blob([text], { type: `${type};charset=utf-8` }), filename);
}

/** Lê um ficheiro escolhido pelo utilizador como texto (UTF-8). */
export function readFileText(file: File): Promise<string> {
  return file.text();
}
