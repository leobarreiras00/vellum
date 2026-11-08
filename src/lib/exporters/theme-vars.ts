/**
 * Vellum — Variáveis de tema para ficheiros exportados (cliente)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Os valores das cores vivem só em globals.css: aqui lêem-se os tokens já
 * calculados de um contentor com o `data-theme` pedido, para os escrever no
 * HTML autónomo (que tem de abrir offline, sem a folha de estilos da app).
 */
"use client";

import type { ThemeId } from "@/lib/themes";

const TOKENS = [
  "--bg-canvas",
  "--bg-surface",
  "--bg-elevated",
  "--text-primary",
  "--text-muted",
  "--accent-primary",
  "--border-subtle",
  "--bg-canvas-rgb",
  "--bg-surface-rgb",
  "--bg-elevated-rgb",
  "--text-primary-rgb",
  "--text-muted-rgb",
  "--accent-primary-rgb",
  "--border-subtle-rgb",
  "--shadow-sheet",
  "--selection",
  ...["carvao", "terracota", "salvia", "ardosia", "ambar", "carmim"].flatMap((ink) => [
    `--doc-ink-${ink}`,
    `--doc-mark-${ink}`,
  ]),
];

/** `:root { --bg-canvas: …; … }` com os valores do tema escolhido. */
export function themeVariablesCss(theme: ThemeId): string {
  const probe = document.createElement("div");
  probe.setAttribute("data-theme", theme);
  probe.style.cssText = "position:fixed;left:-10000px;top:0;width:0;height:0;";
  document.body.appendChild(probe);
  try {
    const style = getComputedStyle(probe);
    const declarations = TOKENS.map((name) => `${name}: ${style.getPropertyValue(name).trim()};`).join(" ");
    const scheme = theme === "dark-espresso" ? "dark" : "light";
    return `:root { ${declarations} color-scheme: ${scheme}; }`;
  } finally {
    probe.remove();
  }
}
