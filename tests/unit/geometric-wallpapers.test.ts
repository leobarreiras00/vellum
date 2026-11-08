/**
 * Vellum — Testes dos wallpapers geométricos e das capas geométricas
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 */
import { describe, expect, it } from "vitest";

import { WALLPAPER_IDS, renderWallpaperSvg, wallpaperDataUrl } from "@/lib/geometric-wallpapers";
import { coverSpecSchema, coverSrc } from "@/lib/illustrations";

describe("geometric-wallpapers", () => {
  it("tem 8 fundos e «none» não desenha nada", () => {
    expect(WALLPAPER_IDS).toHaveLength(8);
    expect(renderWallpaperSvg("none")).toBeNull();
    expect(wallpaperDataUrl("none")).toBeNull();
  });

  it("é determinístico e a variante muda a composição", () => {
    for (const id of WALLPAPER_IDS.filter((w) => w !== "none")) {
      const a = renderWallpaperSvg(id, { variant: 0 });
      expect(a).toMatch(/^<svg [^>]*viewBox="0 0 1600 1000"/);
      expect(renderWallpaperSvg(id, { variant: 0 })).toBe(a);
      expect(renderWallpaperSvg(id, { variant: 7 })).not.toBe(a);
      expect(a).not.toMatch(/NaN|undefined/);
    }
  });

  it("aceita capas geométricas e recusa o papel liso como capa", () => {
    const spec = coverSpecSchema.parse({ type: "wallpaper", wallpaper: "dune-sculpture", variant: 3 });
    expect(coverSrc(spec)).toMatch(/^data:image\/svg\+xml/);
    expect(() => coverSpecSchema.parse({ type: "wallpaper", wallpaper: "none", variant: 0 })).toThrow();
  });
});
