/**
 * Vellum — Ligações no documento (⌘K / Ctrl+K com texto selecionado)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Mark `link` (o mesmo nome que os exportadores já entendem). Só http(s),
 * mailto e âncoras internas; `rel="noopener noreferrer nofollow"` sempre
 * (security-rbac-guard §4).
 */
import { Mark, mergeAttributes } from "@tiptap/core";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    vellumLink: {
      setVellumLink: (href: string) => ReturnType;
      unsetVellumLink: () => ReturnType;
    };
  }
}

/** Normaliza o que a pessoa escreveu: `vellum.pt` → `https://vellum.pt`. `null` se não for seguro. */
export function normalizeHref(value: string): string | null {
  const raw = value.trim();
  if (!raw) return null;
  if (/^(https?:|mailto:)/i.test(raw) || raw.startsWith("#")) return raw;
  if (/^[\w.+-]+@[\w-]+\.[\w.-]+$/.test(raw)) return `mailto:${raw}`;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(raw)) return `https://${raw}`;
  return null;
}

export const VellumLink = Mark.create({
  name: "link",
  priority: 1000,
  inclusive: false,

  addAttributes() {
    return {
      href: {
        default: null,
        parseHTML: (el) => normalizeHref(el.getAttribute("href") ?? ""),
      },
    };
  },

  parseHTML() {
    return [{ tag: "a[href]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const href = normalizeHref(String(HTMLAttributes.href ?? ""));
    return [
      "a",
      mergeAttributes({ href, rel: "noopener noreferrer nofollow", target: href?.startsWith("#") ? null : "_blank" }),
      0,
    ];
  },

  addCommands() {
    return {
      setVellumLink:
        (href) =>
        ({ chain }) => {
          const safe = normalizeHref(href);
          if (!safe) return false;
          return chain().extendMarkRange("link").setMark("link", { href: safe }).run();
        },
      unsetVellumLink:
        () =>
        ({ chain }) =>
          chain().extendMarkRange("link").unsetMark("link").run(),
    };
  },
});
