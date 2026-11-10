/**
 * Vellum — Wallpapers geométricos premium (fundo da aplicação e capas)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Oito composições abstratas desenhadas em SVG com precisão matemática:
 * ondas sedosas (curvas de Catmull-Rom convertidas em Bézier cúbicas), arcos
 * concêntricos, prismas translúcidos, curvas de nível, feixes de luz suaves
 * (desfoque gaussiano), sombras quentes e grão de papel (feTurbulence).
 *
 * Determinístico: o mesmo `id` + `variant` dá sempre a mesma imagem. A variante
 * roda ligeiramente a composição, desloca as fases das ondas e alterna entre
 * as paletas da família («gerar variação de ângulo/cor»).
 *
 * As cores são pigmentos do wallpaper (conteúdo, como as das ilustrações), não
 * tokens de interface; por isso vivem aqui e só aqui.
 */
import { z } from "zod";

import "@/lib/zod-config";

/* ==========================================================================
   Catálogo
   ========================================================================== */

export const WALLPAPERS = [
  {
    id: "sequoia-amber",
    label: "Ondas Terracota & Âmbar",
    blurb: "Curvas sedosas em creme, cobre, terracota e ouro suave.",
    dark: false,
  },
  {
    id: "sonoma-arches",
    label: "Arcos de Luz",
    blurb: "Geometria concêntrica com refração suave em alabastro e areia.",
    dark: false,
  },
  {
    id: "ventura-prism",
    label: "Prismas de Vidro Quente",
    blurb: "Formas sobrepostas com gradientes diagonais.",
    dark: false,
  },
  {
    id: "sage-topography",
    label: "Topografia Sálvia",
    blurb: "Curvas de nível em verde sálvia, jade e velino.",
    dark: false,
  },
  {
    id: "nordic-aurora",
    label: "Feixes Ardósia",
    blurb: "Ondas frias em azul nórdico, prata e marfim.",
    dark: false,
  },
  {
    id: "dune-sculpture",
    label: "Escultura de Areia",
    blurb: "Dunas minimalistas ao pôr do sol.",
    dark: false,
  },
  {
    id: "obsidian-pro",
    label: "Titânio & Cobre",
    blurb: "Feixes profundos sobre expresso escuro.",
    dark: true,
  },
  {
    id: "none",
    label: "Papel Velino Puro",
    blurb: "Sem fundo geométrico: só a cor do tema.",
    dark: false,
  },
] as const;

export type WallpaperId = (typeof WALLPAPERS)[number]["id"];
export const WALLPAPER_IDS = WALLPAPERS.map((w) => w.id) as [WallpaperId, ...WallpaperId[]];
export const wallpaperIdSchema = z.enum(WALLPAPER_IDS);

/** Wallpaper por omissão (e o da página de login). */
export const DEFAULT_WALLPAPER: WallpaperId = "sequoia-amber";

export const WALLPAPER_INTENSITIES = [
  { id: "off", label: "Desligado" },
  { id: "subtil", label: "Subtil" },
  { id: "imersivo", label: "Imersivo" },
] as const;
export type WallpaperIntensity = (typeof WALLPAPER_INTENSITIES)[number]["id"];
export const DEFAULT_WALLPAPER_INTENSITY: WallpaperIntensity = "subtil";

export const isWallpaperId = (value: unknown): value is WallpaperId =>
  typeof value === "string" && (WALLPAPER_IDS as readonly string[]).includes(value);
export const isWallpaperIntensity = (value: unknown): value is WallpaperIntensity =>
  value === "off" || value === "subtil" || value === "imersivo";

export const wallpaperMeta = (id: WallpaperId) => WALLPAPERS.find((w) => w.id === id) ?? WALLPAPERS[0];

/* ==========================================================================
   Geometria
   ========================================================================== */

type Pt = readonly [number, number];

const W = 1600;
const H = 1000;

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Gerador pseudoaleatório (mulberry32): mesma semente → mesma sequência. */
function rng(seed: number) {
  let a = seed >>> 0 || 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Curva suave por pontos (Catmull-Rom → Bézier cúbica), sem o «M» inicial. */
function smooth(points: readonly Pt[]): string {
  let d = "";
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]!;
    const p1 = points[i]!;
    const p2 = points[i + 1]!;
    const p3 = points[i + 2] ?? p2;
    const c1: Pt = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: Pt = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${r1(c1[0])} ${r1(c1[1])} ${r1(c2[0])} ${r1(c2[1])} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}

interface WaveOpts {
  y: number;
  amp: number;
  freq: number;
  phase: number;
  tilt: number;
}

/** Curva fechada suave (Catmull-Rom circular → Bézier cúbica), já com «M» e «Z». */
function smoothClosed(points: readonly Pt[]): string {
  const n = points.length;
  const at = (i: number) => points[((i % n) + n) % n]!;
  let d = `M${r1(at(0)[0])} ${r1(at(0)[1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = at(i - 1);
    const p1 = at(i);
    const p2 = at(i + 1);
    const p3 = at(i + 2);
    d += ` C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return `${d} Z`;
}

/** Pontos de uma onda composta (duas sinusoides) de lado a lado, com folga fora do quadro. */
function wave({ y, amp, freq, phase, tilt }: WaveOpts, steps = 10): Pt[] {
  const pts: Pt[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = -0.15 * W + t * 1.3 * W;
    const k = (x / W) * Math.PI * 2;
    const yy =
      y +
      tilt * (x / W - 0.5) * H +
      amp * Math.sin(freq * k + phase) +
      amp * 0.32 * Math.sin(freq * 2.3 * k + phase * 1.7);
    pts.push([x, yy]);
  }
  return pts;
}

/** Faixa entre duas ondas (fita sedosa). */
function ribbon(top: Pt[], bottom: Pt[]): string {
  const rev = [...bottom].reverse();
  return `M${r1(top[0]![0])} ${r1(top[0]![1])}${smooth(top)} L${r1(rev[0]![0])} ${r1(rev[0]![1])}${smooth(rev)} Z`;
}

/** Área desde uma onda até ao fundo do quadro. */
function toBottom(top: Pt[]): string {
  const last = top[top.length - 1]!;
  return `M${r1(top[0]![0])} ${r1(top[0]![1])}${smooth(top)} L${r1(last[0])} ${H + 200} L${r1(top[0]![0])} ${H + 200} Z`;
}

function linear(id: string, stops: readonly string[], x1 = 0, y1 = 0, x2 = 0, y2 = 1, opacity = 1): string {
  const s = stops
    .map(
      (c, i) =>
        `<stop offset="${r1((i / Math.max(1, stops.length - 1)) * 100)}%" stop-color="${c}" stop-opacity="${opacity}"/>`,
    )
    .join("");
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${s}</linearGradient>`;
}

function radial(id: string, color: string, opacity: number, cx = 0.5, cy = 0.5, r = 0.5): string {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"><stop offset="0%" stop-color="${color}" stop-opacity="${opacity}"/><stop offset="100%" stop-color="${color}" stop-opacity="0"/></radialGradient>`;
}

/** Filtros partilhados: desfoque suave (sombras e feixes) e grão de papel. */
function sharedDefs(grain: number): string {
  return [
    `<filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="22"/></filter>`,
    `<filter id="haze" filterUnits="userSpaceOnUse" x="${-W}" y="${-H}" width="${3 * W}" height="${3 * H}"><feGaussianBlur stdDeviation="60"/></filter>`,
    `<filter id="edge" x="-5%" y="-5%" width="110%" height="110%"><feGaussianBlur stdDeviation="1.6"/></filter>`,
    `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="3" stitchTiles="stitch"/><feColorMatrix type="matrix" values="0 0 0 0 0.11  0 0 0 0 0.1  0 0 0 0 0.09  0 0 0 ${grain} 0"/></filter>`,
  ].join("");
}

const GRAIN_RECT = `<rect width="${W}" height="${H}" filter="url(#grain)"/>`;

/* ==========================================================================
   Paletas (pigmentos)
   ========================================================================== */

const SEQUOIA = [
  {
    sky: ["#FBF4EA", "#F4E2CD"],
    bands: ["#F2DEC4", "#EBC8A0", "#E3AE7C", "#D88E58", "#C96F3E", "#B4572D", "#E8BC79"],
    light: "#FFF6E8",
    shade: "#5A2E17",
  },
  {
    sky: ["#FAF1E6", "#F0D8C2"],
    bands: ["#EFD7BC", "#E7BE95", "#DDA06F", "#CF7F4C", "#BE6438", "#A04B27", "#E2B26C"],
    light: "#FFF3E2",
    shade: "#4E2512",
  },
  {
    sky: ["#FBF5EC", "#F3E6D2"],
    bands: ["#F4E6CF", "#EED4A9", "#E7BD82", "#DDA15E", "#CD8343", "#B9682F", "#F0CF8E"],
    light: "#FFF8EC",
    shade: "#5C3417",
  },
] as const;

const NORDIC = [
  {
    sky: ["#F6F7F8", "#E3E8EE"],
    bands: ["#E9EEF3", "#D3DCE6", "#B9C7D6", "#98AEC3", "#7894AE", "#5B7896", "#C9D3DC"],
    light: "#FFFFFF",
    shade: "#1C2B3B",
  },
  {
    sky: ["#F7F6F2", "#E6E9EA"],
    bands: ["#ECEFEF", "#D7DFE3", "#BFCBD3", "#A2B4C1", "#8199AD", "#647F96", "#D9D6CB"],
    light: "#FFFEFA",
    shade: "#1F2A33",
  },
] as const;

const OBSIDIAN = [
  {
    sky: ["#1A1715", "#0F0D0C"],
    bands: ["#2A2522", "#332C28", "#3D3530", "#463C35", "#2E2724", "#4F4239", "#5A4A3E"],
    edge: "#D08A5C",
    light: "#F2C4A0",
    shade: "#000000",
  },
  {
    sky: ["#171615", "#0C0C0C"],
    bands: ["#262524", "#2F2D2B", "#393633", "#43403C", "#2B2928", "#4C4843", "#58534D"],
    edge: "#C9A27C",
    light: "#EBD3B8",
    shade: "#000000",
  },
] as const;

/* ==========================================================================
   Composições
   ========================================================================== */

type Rand = () => number;

/** Fitas sedosas empilhadas (Sequoia, Nórdico, Obsidiana). */
function silkWaves(
  rand: Rand,
  palette: { sky: readonly string[]; bands: readonly string[]; light: string; shade: string; edge?: string },
  opts: { dark?: boolean; beams?: boolean },
): string {
  const defs: string[] = [linear("sky", palette.sky, 0, 0, 0.4, 1)];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#sky)"/>`];
  defs.push(radial("glow", palette.light, opts.dark ? 0.22 : 0.85, 0.22 + rand() * 0.2, 0.18, 0.55));
  body.push(`<rect width="${W}" height="${H}" fill="url(#glow)"/>`);

  if (opts.beams) {
    for (let i = 0; i < 4; i++) {
      const x = W * (0.15 + i * 0.22 + rand() * 0.06);
      const w = 60 + rand() * 120;
      body.push(
        `<rect x="${r1(x)}" y="-200" width="${r1(w)}" height="${H + 400}" fill="${palette.light}" opacity="${r1(0.18 + rand() * 0.14)}" transform="rotate(${r1(-18 + rand() * 8)} ${r1(x)} ${H / 2})" filter="url(#haze)"/>`,
      );
    }
  }

  const count = palette.bands.length;
  const freq = 0.55 + rand() * 0.25;
  const tilt = -0.35 + rand() * 0.15;
  const basePhase = rand() * Math.PI * 2;
  for (let i = 0; i < count; i++) {
    const y = H * (0.12 + i * 0.13) + rand() * 30;
    const amp = 70 + rand() * 70;
    const phase = basePhase + i * 0.55 + rand() * 0.4;
    const thick = 150 + rand() * 120;
    const top = wave({ y, amp, freq, phase, tilt });
    const bottom = wave({ y: y + thick, amp: amp * 0.8, freq, phase: phase + 0.35, tilt });
    const id = `b${i}`;
    const c = palette.bands[i]!;
    const next = palette.bands[(i + 1) % count]!;
    defs.push(linear(id, [c, next], 0, 0, 1, 1));
    // A última fita desce até ao fundo do quadro (sem papel à vista por baixo).
    const d = i === count - 1 ? toBottom(top) : ribbon(top, bottom);
    // Sombra quente sob a fita, depois a fita, depois o brilho especular da aresta.
    body.push(
      `<path d="${d}" fill="${palette.shade}" opacity="${opts.dark ? 0.55 : 0.16}" transform="translate(0 18)" filter="url(#soft)"/>`,
    );
    body.push(`<path d="${d}" fill="url(#${id})"/>`);
    body.push(
      `<path d="M${r1(top[0]![0])} ${r1(top[0]![1])}${smooth(top)}" fill="none" stroke="${palette.edge ?? palette.light}" stroke-width="${opts.dark ? 2.2 : 2.4}" stroke-opacity="${opts.dark ? 0.9 : 0.55}" filter="url(#edge)"/>`,
    );
  }
  return `<defs>${defs.join("")}${sharedDefs(opts.dark ? 0.09 : 0.06)}</defs>${body.join("")}`;
}

function sonomaArches(rand: Rand, variant: number): string {
  const tones = [
    ["#FAF5EC", "#F2E7D6", "#EAD9C1", "#E1C9AA", "#D7B892", "#CCA67B", "#F4EBDD", "#E7D3B6"],
    ["#F8F4EE", "#EEE5DA", "#E4D6C6", "#D9C6B1", "#CDB59C", "#C1A387", "#F1EADF", "#E2D1BE"],
  ][variant % 2]!;
  const cx = W * (0.62 + rand() * 0.16);
  const cy = H * (1.02 + rand() * 0.1);
  const defs: string[] = [
    linear("sky", ["#FBF7F0", "#F1E6D6"], 0, 0, 1, 1),
    radial("glow", "#FFF9EF", 0.9, 0.2, 0.1, 0.6),
  ];
  const body: string[] = [
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    `<rect width="${W}" height="${H}" fill="url(#glow)"/>`,
  ];
  const rings = 9;
  for (let i = 0; i < rings; i++) {
    const r = H * (1.35 - i * 0.13);
    const id = `a${i}`;
    defs.push(linear(id, [tones[i % tones.length]!, tones[(i + 3) % tones.length]!], 0, 0, 1, 1));
    body.push(
      `<circle cx="${r1(cx)}" cy="${r1(cy + 16)}" r="${r1(r)}" fill="#6B4A2A" opacity="0.13" filter="url(#soft)"/>`,
      `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" fill="url(#${id})"/>`,
      `<circle cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r - 1.5)}" fill="none" stroke="#FFFCF5" stroke-opacity="0.7" stroke-width="2" filter="url(#edge)"/>`,
    );
  }
  // Refração: um feixe diagonal de luz atravessa os arcos.
  body.push(
    `<rect x="${r1(W * 0.25)}" y="-300" width="180" height="${H + 600}" fill="#FFFDF7" opacity="0.32" transform="rotate(28 ${W / 2} ${H / 2})" filter="url(#haze)"/>`,
  );
  return `<defs>${defs.join("")}${sharedDefs(0.06)}</defs>${body.join("")}`;
}

function venturaPrism(rand: Rand, variant: number): string {
  const sets = [
    ["#F4C9A8", "#EAA77F", "#F7E3CB", "#D98C68", "#F1D2B6", "#C77755", "#FBEBDA"],
    ["#F0CDB8", "#E3A08F", "#F6E2D2", "#CF8476", "#EED5C4", "#BC6E62", "#FAEEE4"],
  ][variant % 2]!;
  const defs: string[] = [
    linear("sky", ["#FBF5EE", "#F2E2D2"], 0, 0, 1, 1),
    radial("glow", "#FFF7EC", 0.9, 0.75, 0.2, 0.6),
  ];
  const body: string[] = [
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    `<rect width="${W}" height="${H}" fill="url(#glow)"/>`,
  ];
  for (let i = 0; i < 6; i++) {
    const cx = W * (0.1 + rand() * 0.85);
    const cy = H * (0.1 + rand() * 0.85);
    const size = 380 + rand() * 420;
    const rot = -40 + rand() * 80;
    const sides = 3 + Math.floor(rand() * 2);
    const pts: string[] = [];
    for (let k = 0; k < sides; k++) {
      const a = (k / sides) * Math.PI * 2 + rand() * 0.25;
      const rr = size * (0.75 + rand() * 0.35);
      pts.push(`${r1(cx + Math.cos(a) * rr)},${r1(cy + Math.sin(a) * rr * 0.8)}`);
    }
    const id = `p${i}`;
    defs.push(linear(id, [sets[i % sets.length]!, sets[(i + 2) % sets.length]!], 0, 0, 1, 1, 0.62));
    body.push(
      `<polygon points="${pts.join(" ")}" fill="#5B3420" opacity="0.1" transform="translate(10 22) rotate(${r1(rot)} ${r1(cx)} ${r1(cy)})" filter="url(#soft)"/>`,
      `<polygon points="${pts.join(" ")}" fill="url(#${id})" stroke="#FFFBF4" stroke-opacity="0.6" stroke-width="1.6" stroke-linejoin="round" transform="rotate(${r1(rot)} ${r1(cx)} ${r1(cy)})"/>`,
    );
  }
  body.push(
    `<rect x="${r1(W * 0.5)}" y="-300" width="240" height="${H + 600}" fill="#FFFDF8" opacity="0.28" transform="rotate(-32 ${W / 2} ${H / 2})" filter="url(#haze)"/>`,
  );
  return `<defs>${defs.join("")}${sharedDefs(0.06)}</defs>${body.join("")}`;
}

function sageTopography(rand: Rand, variant: number): string {
  const fills = [
    ["#EEF1EA", "#E1E8DC", "#D2DDCB", "#C1D1B9", "#AFC4A6", "#9CB693", "#88A780", "#76986E"],
    ["#F0F2EC", "#E3E9E0", "#D3DED2", "#C0D2C2", "#ABC4B2", "#96B6A2", "#80A792", "#6C9883"],
  ][variant % 2]!;
  const defs: string[] = [
    linear("sky", ["#F5F5EF", "#E9EDE3"], 0, 0, 1, 1),
    radial("glow", "#FFFFF8", 0.8, 0.8, 0.15, 0.6),
  ];
  const body: string[] = [`<rect width="${W}" height="${H}" fill="url(#sky)"/>`];
  const centers: Pt[] = [
    [W * (0.25 + rand() * 0.15), H * (0.65 + rand() * 0.2)],
    [W * (0.72 + rand() * 0.15), H * (0.3 + rand() * 0.2)],
  ];
  for (const [ci, [cx, cy]] of centers.entries()) {
    const levels = 8;
    const seedPhase = rand() * Math.PI * 2;
    for (let l = 0; l < levels; l++) {
      const base = (ci === 0 ? 720 : 560) * (1 - l / (levels + 0.6));
      const pts: Pt[] = [];
      const n = 14;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const rr = base * (1 + 0.16 * Math.sin(3 * a + seedPhase + l * 0.3) + 0.08 * Math.sin(5 * a - seedPhase));
        pts.push([cx + Math.cos(a) * rr * 1.25, cy + Math.sin(a) * rr * 0.8]);
      }
      const d = smoothClosed(pts);
      const fill = fills[Math.min(fills.length - 1, l)]!;
      body.push(
        `<path d="${d}" fill="#24412B" opacity="0.08" transform="translate(0 12)" filter="url(#soft)"/>`,
        `<path d="${d}" fill="${fill}" stroke="#FBFCF7" stroke-opacity="0.75" stroke-width="1.8"/>`,
      );
    }
  }
  body.push(`<rect width="${W}" height="${H}" fill="url(#glow)"/>`);
  return `<defs>${defs.join("")}${sharedDefs(0.06)}</defs>${body.join("")}`;
}

function duneSculpture(rand: Rand, variant: number): string {
  const sets = [
    {
      sky: ["#FBEEDC", "#F4D6B2"],
      sun: "#FFE3B8",
      dunes: ["#EFCB9C", "#E6B47F", "#DB9C64", "#CC8550", "#B86E3F", "#9E5A33"],
    },
    {
      sky: ["#FAF0E2", "#EFD8BF"],
      sun: "#FFE9C9",
      dunes: ["#ECD2AE", "#E2BC92", "#D6A479", "#C78D65", "#B47754", "#9A6346"],
    },
  ][variant % 2]!;
  const defs: string[] = [linear("sky", sets.sky, 0, 0, 0, 1), radial("sun", sets.sun, 1, 0.5, 0.5, 0.5)];
  const sx = W * (0.3 + rand() * 0.4);
  const sy = H * (0.3 + rand() * 0.1);
  const body: string[] = [
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    `<circle cx="${r1(sx)}" cy="${r1(sy)}" r="520" fill="url(#sun)" opacity="0.9"/>`,
    `<circle cx="${r1(sx)}" cy="${r1(sy)}" r="120" fill="#FFF4E0" opacity="0.85" filter="url(#edge)"/>`,
  ];
  const n = sets.dunes.length;
  for (let i = 0; i < n; i++) {
    const y = H * (0.42 + i * 0.1);
    const top = wave(
      { y, amp: 50 + rand() * 50, freq: 0.4 + rand() * 0.3, phase: rand() * Math.PI * 2, tilt: -0.1 + rand() * 0.2 },
      8,
    );
    const id = `d${i}`;
    defs.push(linear(id, [sets.dunes[i]!, sets.dunes[Math.min(n - 1, i + 1)]!], 0, 0, 1, 1));
    const d = toBottom(top);
    body.push(
      `<path d="${d}" fill="#4A2814" opacity="0.14" transform="translate(0 -10)" filter="url(#soft)"/>`,
      `<path d="${d}" fill="url(#${id})"/>`,
      `<path d="M${r1(top[0]![0])} ${r1(top[0]![1])}${smooth(top)}" fill="none" stroke="#FFF2DD" stroke-opacity="0.6" stroke-width="2" filter="url(#edge)"/>`,
    );
  }
  return `<defs>${defs.join("")}${sharedDefs(0.07)}</defs>${body.join("")}`;
}

/* ==========================================================================
   API
   ========================================================================== */

export interface WallpaperRenderOptions {
  /** Variação de ângulo/cor (0 = composição de referência). */
  variant?: number;
  width?: number;
  height?: number;
}

/** SVG completo do wallpaper (string). `none` devolve `null`. */
export function renderWallpaperSvg(id: WallpaperId, options: WallpaperRenderOptions = {}): string | null {
  if (id === "none") return null;
  const variant = Math.max(0, Math.floor(options.variant ?? 0));
  const seedBase = [...id].reduce((acc, ch) => (acc * 31 + ch.charCodeAt(0)) >>> 0, 7);
  const rand = rng(seedBase + variant * 7919);
  let inner: string;
  switch (id) {
    case "sequoia-amber":
      inner = silkWaves(rand, SEQUOIA[variant % SEQUOIA.length]!, {});
      break;
    case "nordic-aurora":
      inner = silkWaves(rand, NORDIC[variant % NORDIC.length]!, { beams: true });
      break;
    case "obsidian-pro":
      inner = silkWaves(rand, OBSIDIAN[variant % OBSIDIAN.length]!, { dark: true, beams: true });
      break;
    case "sonoma-arches":
      inner = sonomaArches(rand, variant);
      break;
    case "ventura-prism":
      inner = venturaPrism(rand, variant);
      break;
    case "sage-topography":
      inner = sageTopography(rand, variant);
      break;
    case "dune-sculpture":
      inner = duneSculpture(rand, variant);
      break;
  }
  // Variante: rotação ligeira da composição, ampliada para cobrir sempre o quadro.
  const angle = variant === 0 ? 0 : ((variant * 37) % 25) - 12;
  const scale = angle === 0 ? 1 : 1.18;
  const width = options.width ?? W;
  const height = options.height ?? H;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">` +
    `<g transform="translate(${W / 2} ${H / 2}) rotate(${angle}) scale(${scale}) translate(${-W / 2} ${-H / 2})">${inner}</g>` +
    `${GRAIN_RECT}</svg>`
  );
}

const cache = new Map<string, string | null>();

/** Data URL (SVG) do wallpaper, com cache por id + variante + tamanho. */
export function wallpaperDataUrl(id: WallpaperId, options: WallpaperRenderOptions = {}): string | null {
  const key = `${id}:${options.variant ?? 0}:${options.width ?? W}x${options.height ?? H}`;
  if (cache.has(key)) return cache.get(key)!;
  const svg = renderWallpaperSvg(id, options);
  const url = svg ? `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` : null;
  cache.set(key, url);
  return url;
}

/** Nova variante aleatória (1…9999) para «Gerar variação». */
export const freshVariant = () => 1 + Math.floor(Math.random() * 9998);
