/**
 * Vellum — Ilustrações editoriais (coleções, estilos e gerador local)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Gerador procedimental em SVG, determinístico (a mesma descrição e semente
 * dão sempre a mesma imagem), sem qualquer serviço externo. A descrição em
 * português escolhe o motivo (palavras como «flor», «ponte», «lua», «montanha»,
 * «livro»), a coleção dá a paleta e o motivo por omissão, e o estilo decide o
 * traço (gravura, aguarela, xilogravura ou esboço).
 *
 * As cores são pigmentos da ilustração (conteúdo, como as tintas das etiquetas),
 * não tokens de interface; por isso vivem aqui e só aqui.
 */
import { z } from "zod";

/* ==========================================================================
   Coleções e estilos
   ========================================================================== */

export const ILLUSTRATION_COLLECTIONS = [
  { id: "herbario", label: "Herbário Botânico", blurb: "Folhas, caules e flores prensadas em papel." },
  { id: "arquitetura", label: "Atelier de Arquitetura", blurb: "Fachadas, arcos e linhas de construção." },
  { id: "sumi-e", label: "Aguarela Oriental Sumi-e", blurb: "Montanhas, bambu e névoa a tinta diluída." },
  { id: "celeste", label: "Atlas Celestial", blurb: "Órbitas, constelações e fases da lua." },
  { id: "ex-libris", label: "Ex-Libris Literário", blurb: "Livros abertos, penas e molduras de gravura." },
  { id: "velino", label: "Velino Puro", blurb: "Quase nada: filetes, um círculo, o papel." },
] as const;

export type IllustrationCollection = (typeof ILLUSTRATION_COLLECTIONS)[number]["id"];
export const ILLUSTRATION_COLLECTION_IDS = ILLUSTRATION_COLLECTIONS.map((c) => c.id) as [
  IllustrationCollection,
  ...IllustrationCollection[],
];
export const DEFAULT_ILLUSTRATION_COLLECTION: IllustrationCollection = "velino";

export const ILLUSTRATION_STYLES = [
  { id: "gravura", label: "Gravura a Tinta" },
  { id: "aguarela", label: "Aguarela Creme" },
  { id: "xilogravura", label: "Xilogravura" },
  { id: "esboco", label: "Esboço Arquitetónico" },
] as const;

export type IllustrationStyle = (typeof ILLUSTRATION_STYLES)[number]["id"];
export const ILLUSTRATION_STYLE_IDS = ILLUSTRATION_STYLES.map((s) => s.id) as [
  IllustrationStyle,
  ...IllustrationStyle[],
];

export const collectionLabel = (id: IllustrationCollection) =>
  ILLUSTRATION_COLLECTIONS.find((c) => c.id === id)?.label ?? id;
export const styleLabel = (id: IllustrationStyle) => ILLUSTRATION_STYLES.find((s) => s.id === id)?.label ?? id;

/* ==========================================================================
   Capas (projetos e documentos)
   ========================================================================== */

/** Tamanho máximo de uma capa carregada (data URL, ~1,2 MB de imagem). */
export const COVER_UPLOAD_MAX_DATA_URL = 1_600_000;

export const coverSpecSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("generated"),
    collection: z.enum(ILLUSTRATION_COLLECTION_IDS),
    style: z.enum(ILLUSTRATION_STYLE_IDS),
    prompt: z.string().trim().max(200, "Máximo de 200 caracteres.").default(""),
    seed: z
      .number()
      .int()
      .min(0)
      .max(2 ** 31),
  }),
  z.object({
    type: z.literal("upload"),
    src: z
      .string()
      .max(COVER_UPLOAD_MAX_DATA_URL, "A imagem é demasiado grande (máximo de cerca de 1 MB depois de comprimida).")
      .regex(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/, "Formato de imagem não suportado."),
  }),
]);
export type CoverSpec = z.infer<typeof coverSpecSchema>;
export type GeneratedCover = Extract<CoverSpec, { type: "generated" }>;

/* ==========================================================================
   Galeria curada (12 capas feitas com o mesmo motor)
   ========================================================================== */

export const CURATED_COVERS: ReadonlyArray<{ id: string; title: string; spec: GeneratedCover }> = [
  { id: "c01", title: "Ramo de oliveira", spec: g("herbario", "gravura", "ramo de oliveira com folhas", 11) },
  { id: "c02", title: "Flor de camélia", spec: g("herbario", "aguarela", "flor de camélia", 23) },
  { id: "c03", title: "Arcada do claustro", spec: g("arquitetura", "esboco", "arcos de um claustro", 7) },
  { id: "c04", title: "Ponte sobre o rio", spec: g("arquitetura", "xilogravura", "ponte sobre o rio", 42) },
  { id: "c05", title: "Montanha na névoa", spec: g("sumi-e", "aguarela", "montanha na névoa ao amanhecer", 5) },
  { id: "c06", title: "Bambu ao vento", spec: g("sumi-e", "gravura", "bambu ao vento", 31) },
  { id: "c07", title: "Constelação de Órion", spec: g("celeste", "gravura", "constelação de estrelas", 3) },
  { id: "c08", title: "Fases da lua", spec: g("celeste", "xilogravura", "lua cheia e órbitas", 17) },
  { id: "c09", title: "Livro aberto", spec: g("ex-libris", "gravura", "livro aberto com pena", 9) },
  { id: "c10", title: "Tinteiro e carta", spec: g("ex-libris", "aguarela", "tinteiro e carta", 28) },
  { id: "c11", title: "Filetes de velino", spec: g("velino", "gravura", "", 1) },
  { id: "c12", title: "Sol de papel", spec: g("velino", "aguarela", "sol sobre o papel", 64) },
];

function g(collection: IllustrationCollection, style: IllustrationStyle, prompt: string, seed: number): GeneratedCover {
  return { type: "generated", collection, style, prompt, seed };
}

/* ==========================================================================
   Gerador
   ========================================================================== */

type Motif = "botanical" | "architecture" | "landscape" | "celestial" | "book" | "minimal";

const COLLECTION_MOTIF: Record<IllustrationCollection, Motif> = {
  herbario: "botanical",
  arquitetura: "architecture",
  "sumi-e": "landscape",
  celeste: "celestial",
  "ex-libris": "book",
  velino: "minimal",
};

interface Palette {
  paper: string;
  wash: string;
  ink: string;
  accent: string;
  soft: string;
}

const PALETTES: Record<IllustrationCollection, Palette> = {
  herbario: { paper: "#F4EFE4", wash: "#C9D4B8", ink: "#2F3A2A", accent: "#2D6A4F", soft: "#E4E6D3" },
  arquitetura: { paper: "#F3EFE8", wash: "#D8CFC0", ink: "#2B2A26", accent: "#2B5B84", soft: "#E7E1D6" },
  "sumi-e": { paper: "#F6F1E7", wash: "#BEB8AE", ink: "#1F1E1B", accent: "#9B2C2C", soft: "#E6E0D4" },
  celeste: { paper: "#1E2433", wash: "#3A4560", ink: "#F1E9D8", accent: "#D9A441", soft: "#2A3246" },
  "ex-libris": { paper: "#F2EADB", wash: "#D9C7A7", ink: "#3A2A1E", accent: "#8C3B22", soft: "#E8DCC6" },
  velino: { paper: "#FAF7F2", wash: "#EDE5D8", ink: "#3B3833", accent: "#C85A32", soft: "#F2ECE1" },
};

const KEYWORDS: Array<{ motif: Motif; words: string[] }> = [
  {
    motif: "botanical",
    words: [
      "flor",
      "folha",
      "planta",
      "jardim",
      "árvore",
      "arvore",
      "ramo",
      "oliveira",
      "rosa",
      "camélia",
      "camelia",
      "erva",
      "botân",
      "botan",
      "pétala",
      "petala",
      "semente",
      "floresta",
    ],
  },
  {
    motif: "architecture",
    words: [
      "casa",
      "edifício",
      "edificio",
      "ponte",
      "cidade",
      "janela",
      "arco",
      "claustro",
      "coluna",
      "torre",
      "fachada",
      "igreja",
      "rua",
      "planta de",
      "atelier",
      "museu",
    ],
  },
  {
    motif: "landscape",
    words: [
      "montanha",
      "mar",
      "rio",
      "onda",
      "bambu",
      "névoa",
      "nevoa",
      "lago",
      "paisagem",
      "colina",
      "vale",
      "amanhecer",
      "pôr do sol",
      "por do sol",
    ],
  },
  {
    motif: "celestial",
    words: [
      "lua",
      "estrela",
      "céu",
      "ceu",
      "noite",
      "planeta",
      "órbita",
      "orbita",
      "constela",
      "cometa",
      "galáxia",
      "galaxia",
      "eclipse",
      "astro",
    ],
  },
  {
    motif: "book",
    words: [
      "livro",
      "pena",
      "tinteiro",
      "carta",
      "biblioteca",
      "página",
      "pagina",
      "poema",
      "escrita",
      "caderno",
      "manuscrito",
      "leitura",
    ],
  },
];

/** Escolhe o motivo pela descrição; sem palavras-chave, usa o da coleção. */
export function motifFor(prompt: string, collection: IllustrationCollection): Motif {
  const text = prompt.toLowerCase();
  let best: { motif: Motif; index: number } | null = null;
  for (const { motif, words } of KEYWORDS) {
    for (const word of words) {
      const index = text.indexOf(word);
      if (index >= 0 && (!best || index < best.index)) best = { motif, index };
    }
  }
  return best?.motif ?? COLLECTION_MOTIF[collection];
}

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const f = (n: number) => (Math.round(n * 10) / 10).toString();

interface Pen {
  /** Forma cheia (folha, edifício, montanha). */
  shape(d: string, tone?: "wash" | "accent" | "ink"): string;
  /** Traço (caule, filete, órbita). */
  line(d: string, weight?: number, tone?: "ink" | "accent"): string;
  /** Pequeno ponto (estrela, semente). */
  dot(x: number, y: number, r: number, tone?: "ink" | "accent"): string;
}

function makePen(style: IllustrationStyle, p: Palette, rnd: () => number): Pen {
  const tone = (t: "wash" | "accent" | "ink") => (t === "wash" ? p.wash : t === "accent" ? p.accent : p.ink);
  const jitter = (d: string) => d.replace(/-?\d+(\.\d+)?/g, (n) => f(Number(n) + (rnd() - 0.5) * 2.2));
  switch (style) {
    case "gravura":
      return {
        shape: (d, t = "wash") =>
          `<path d="${d}" fill="url(#hatch-${t === "accent" ? "a" : "i"})" stroke="${p.ink}" stroke-width="1" stroke-linejoin="round"/>`,
        line: (d, w = 1, t = "ink") =>
          `<path d="${d}" fill="none" stroke="${tone(t)}" stroke-width="${f(w)}" stroke-linecap="round"/>`,
        dot: (x, y, r, t = "ink") => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${tone(t)}"/>`,
      };
    case "aguarela":
      return {
        shape: (d, t = "wash") =>
          `<path d="${d}" fill="${tone(t)}" fill-opacity="${f(0.45 + rnd() * 0.3)}" filter="url(#wc)"/>`,
        line: (d, w = 1, t = "ink") =>
          `<path d="${d}" fill="none" stroke="${tone(t)}" stroke-opacity="0.75" stroke-width="${f(w * 1.6)}" stroke-linecap="round" filter="url(#wc)"/>`,
        dot: (x, y, r, t = "ink") =>
          `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r * 1.4)}" fill="${tone(t)}" fill-opacity="0.7" filter="url(#wc)"/>`,
      };
    case "xilogravura":
      return {
        shape: (d, t = "wash") =>
          `<path d="${d}" fill="${t === "wash" ? p.ink : tone(t)}" stroke="${p.ink}" stroke-width="2.5" stroke-linejoin="round"/>`,
        line: (d, w = 1, t = "ink") =>
          `<path d="${d}" fill="none" stroke="${tone(t)}" stroke-width="${f(w * 3)}" stroke-linecap="square"/>`,
        dot: (x, y, r, t = "ink") =>
          `<rect x="${f(x - r)}" y="${f(y - r)}" width="${f(r * 2)}" height="${f(r * 2)}" fill="${tone(t)}"/>`,
      };
    case "esboco":
      return {
        shape: (d) =>
          `<path d="${d}" fill="none" stroke="${p.ink}" stroke-width="0.8" stroke-opacity="0.85"/><path d="${jitter(d)}" fill="none" stroke="${p.ink}" stroke-width="0.5" stroke-opacity="0.45"/>`,
        line: (d, w = 1, t = "ink") =>
          `<path d="${d}" fill="none" stroke="${tone(t)}" stroke-width="${f(w * 0.8)}" stroke-opacity="0.85" stroke-linecap="round"/><path d="${jitter(d)}" fill="none" stroke="${tone(t)}" stroke-width="0.4" stroke-opacity="0.4"/>`,
        dot: (x, y, r, t = "ink") =>
          `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="none" stroke="${tone(t)}" stroke-width="0.7"/>`,
      };
  }
}

type Draw = (pen: Pen, rnd: () => number, w: number, h: number) => string;

const drawBotanical: Draw = (pen, rnd, w, h) => {
  const out: string[] = [];
  const stems = 1 + Math.floor(rnd() * 3);
  for (let s = 0; s < stems; s++) {
    const x0 = w * (0.3 + rnd() * 0.4);
    const y0 = h * 0.95;
    const x1 = x0 + (rnd() - 0.5) * w * 0.35;
    const y1 = h * (0.12 + rnd() * 0.2);
    const cx = (x0 + x1) / 2 + (rnd() - 0.5) * w * 0.3;
    out.push(pen.line(`M${f(x0)} ${f(y0)} Q${f(cx)} ${f(h * 0.5)} ${f(x1)} ${f(y1)}`, 1.4));
    const leaves = 4 + Math.floor(rnd() * 5);
    for (let i = 1; i <= leaves; i++) {
      const t = i / (leaves + 1);
      const px = (1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1;
      const py = (1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * (h * 0.5) + t * t * y1;
      const side = i % 2 === 0 ? 1 : -1;
      const len = h * (0.1 + rnd() * 0.06) * (1 - t * 0.4);
      const ex = px + side * len;
      const ey = py - len * 0.55;
      out.push(
        pen.shape(
          `M${f(px)} ${f(py)} Q${f(px + side * len * 0.5)} ${f(py - len * 0.85)} ${f(ex)} ${f(ey)} Q${f(px + side * len * 0.55)} ${f(py + len * 0.05)} ${f(px)} ${f(py)}Z`,
        ),
      );
    }
    if (rnd() > 0.35) {
      const petals = 5 + Math.floor(rnd() * 4);
      const r = h * (0.06 + rnd() * 0.03);
      for (let k = 0; k < petals; k++) {
        const a = (k / petals) * Math.PI * 2;
        const px = x1 + Math.cos(a) * r;
        const py = y1 + Math.sin(a) * r;
        out.push(
          pen.shape(
            `M${f(x1)} ${f(y1)} Q${f(x1 + Math.cos(a - 0.5) * r * 1.4)} ${f(y1 + Math.sin(a - 0.5) * r * 1.4)} ${f(px)} ${f(py)} Q${f(x1 + Math.cos(a + 0.5) * r * 1.4)} ${f(y1 + Math.sin(a + 0.5) * r * 1.4)} ${f(x1)} ${f(y1)}Z`,
            "accent",
          ),
        );
      }
      out.push(pen.dot(x1, y1, r * 0.25, "ink"));
    }
  }
  return out.join("");
};

const drawArchitecture: Draw = (pen, rnd, w, h) => {
  const out: string[] = [];
  const ground = h * 0.86;
  const bw = w * (0.46 + rnd() * 0.18);
  const bh = h * (0.44 + rnd() * 0.16);
  const x = (w - bw) / 2;
  const y = ground - bh;
  out.push(pen.shape(`M${f(x)} ${f(ground)} V${f(y)} H${f(x + bw)} V${f(ground)}Z`));
  // frontão
  out.push(pen.shape(`M${f(x - 6)} ${f(y)} L${f(w / 2)} ${f(y - h * 0.12)} L${f(x + bw + 6)} ${f(y)}Z`, "accent"));
  const bays = 3 + Math.floor(rnd() * 3);
  const bay = bw / bays;
  const arched = rnd() > 0.4;
  for (let i = 0; i < bays; i++) {
    const wx = x + i * bay + bay * 0.22;
    const ww = bay * 0.56;
    const top = y + bh * 0.22;
    const bottom = ground - (i === Math.floor(bays / 2) ? 0 : bh * 0.18);
    const d = arched
      ? `M${f(wx)} ${f(bottom)} V${f(top + ww / 2)} A${f(ww / 2)} ${f(ww / 2)} 0 0 1 ${f(wx + ww)} ${f(top + ww / 2)} V${f(bottom)}`
      : `M${f(wx)} ${f(bottom)} V${f(top)} H${f(wx + ww)} V${f(bottom)}`;
    out.push(pen.line(d, 1.2));
  }
  out.push(pen.line(`M${f(w * 0.06)} ${f(ground)} H${f(w * 0.94)}`, 1.6));
  if (rnd() > 0.5) {
    // ponte/arcos ao fundo
    const n = 3;
    for (let i = 0; i < n; i++) {
      const ax = w * 0.08 + i * w * 0.07;
      out.push(
        pen.line(
          `M${f(ax)} ${f(ground)} A${f(w * 0.035)} ${f(w * 0.035)} 0 0 1 ${f(ax + w * 0.07)} ${f(ground)}`,
          0.8,
          "accent",
        ),
      );
    }
  }
  return out.join("");
};

const drawLandscape: Draw = (pen, rnd, w, h) => {
  const out: string[] = [];
  out.push(pen.dot(w * (0.62 + rnd() * 0.2), h * (0.2 + rnd() * 0.1), h * 0.08, "accent"));
  const layers = 3;
  for (let l = 0; l < layers; l++) {
    const base = h * (0.55 + l * 0.13);
    let d = `M0 ${f(h)} L0 ${f(base)}`;
    const steps = 6 + Math.floor(rnd() * 4);
    for (let i = 1; i <= steps; i++) {
      const px = (i / steps) * w;
      const py = base - rnd() * h * (0.28 - l * 0.06);
      const qx = px - w / steps / 2;
      d += ` Q${f(qx)} ${f(py - h * 0.04)} ${f(px)} ${f(base - rnd() * h * 0.06)}`;
    }
    d += ` L${f(w)} ${f(h)}Z`;
    out.push(pen.shape(d, l === layers - 1 ? "ink" : "wash"));
  }
  const canes = 2 + Math.floor(rnd() * 3);
  for (let c = 0; c < canes; c++) {
    const bx = w * (0.08 + c * 0.05 + rnd() * 0.03);
    out.push(pen.line(`M${f(bx)} ${f(h)} Q${f(bx + 6)} ${f(h * 0.5)} ${f(bx + rnd() * 14)} ${f(h * 0.12)}`, 1.6));
    for (let k = 0; k < 3; k++) {
      const ly = h * (0.25 + k * 0.18 + rnd() * 0.05);
      out.push(pen.line(`M${f(bx + 3)} ${f(ly)} q${f(18 + rnd() * 10)} ${f(-6)} ${f(30 + rnd() * 12)} ${f(4)}`, 1.1));
    }
  }
  return out.join("");
};

const drawCelestial: Draw = (pen, rnd, w, h) => {
  const out: string[] = [];
  const cx = w * 0.5;
  const cy = h * 0.52;
  for (let i = 1; i <= 3; i++) {
    const rx = w * 0.14 * i;
    const ry = h * 0.08 * i;
    out.push(
      pen.line(
        `M${f(cx - rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx + rx)} ${f(cy)} A${f(rx)} ${f(ry)} 0 1 0 ${f(cx - rx)} ${f(cy)}`,
        0.6,
      ),
    );
  }
  const r = h * 0.12;
  out.push(
    pen.shape(
      `M${f(cx)} ${f(cy - r)} A${f(r)} ${f(r)} 0 1 1 ${f(cx)} ${f(cy + r)} A${f(r * 0.6)} ${f(r)} 0 1 0 ${f(cx)} ${f(cy - r)}Z`,
      "accent",
    ),
  );
  const stars: Array<[number, number]> = [];
  for (let i = 0; i < 22; i++) {
    const sx = rnd() * w;
    const sy = rnd() * h;
    stars.push([sx, sy]);
    out.push(pen.dot(sx, sy, 0.8 + rnd() * 1.6, i % 5 === 0 ? "accent" : "ink"));
  }
  const chain = stars.slice(0, 5).sort((a, b) => a[0] - b[0]);
  out.push(pen.line(`M${chain.map(([x, y]) => `${f(x)} ${f(y)}`).join(" L")}`, 0.6, "accent"));
  return out.join("");
};

const drawBook: Draw = (pen, rnd, w, h) => {
  const out: string[] = [];
  const cx = w / 2;
  const by = h * 0.62;
  const bw = w * 0.3;
  const bh = h * 0.22;
  out.push(
    pen.shape(
      `M${f(cx)} ${f(by)} Q${f(cx - bw * 0.5)} ${f(by - bh * 0.35)} ${f(cx - bw)} ${f(by - bh * 0.1)} V${f(by + bh * 0.55)} Q${f(cx - bw * 0.5)} ${f(by + bh * 0.25)} ${f(cx)} ${f(by + bh * 0.6)}Z`,
    ),
  );
  out.push(
    pen.shape(
      `M${f(cx)} ${f(by)} Q${f(cx + bw * 0.5)} ${f(by - bh * 0.35)} ${f(cx + bw)} ${f(by - bh * 0.1)} V${f(by + bh * 0.55)} Q${f(cx + bw * 0.5)} ${f(by + bh * 0.25)} ${f(cx)} ${f(by + bh * 0.6)}Z`,
    ),
  );
  for (let i = 1; i <= 4; i++) {
    const ly = by + i * bh * 0.1;
    out.push(
      pen.line(
        `M${f(cx - bw * 0.85)} ${f(ly - bh * 0.05)} Q${f(cx - bw * 0.45)} ${f(ly - bh * 0.22)} ${f(cx - bw * 0.1)} ${f(ly)}`,
        0.6,
      ),
    );
    out.push(
      pen.line(
        `M${f(cx + bw * 0.1)} ${f(ly)} Q${f(cx + bw * 0.45)} ${f(ly - bh * 0.22)} ${f(cx + bw * 0.85)} ${f(ly - bh * 0.05)}`,
        0.6,
      ),
    );
  }
  // pena
  const qx = cx + bw * (0.2 + rnd() * 0.3);
  const qy = by - bh * 0.4;
  out.push(
    pen.shape(
      `M${f(qx)} ${f(qy)} Q${f(qx + w * 0.12)} ${f(qy - h * 0.32)} ${f(qx + w * 0.2)} ${f(qy - h * 0.42)} Q${f(qx + w * 0.06)} ${f(qy - h * 0.2)} ${f(qx)} ${f(qy)}Z`,
      "accent",
    ),
  );
  out.push(pen.line(`M${f(qx)} ${f(qy)} L${f(qx + w * 0.16)} ${f(qy - h * 0.36)}`, 0.8));
  return out.join("");
};

const drawMinimal: Draw = (pen, rnd, w, h) => {
  const out: string[] = [];
  const r = h * (0.16 + rnd() * 0.08);
  out.push(
    pen.shape(
      `M${f(w * 0.62 - r)} ${f(h * 0.45)} a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0 a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0`,
      "accent",
    ),
  );
  const rules = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < rules; i++) {
    const y = h * (0.62 + i * 0.06);
    out.push(pen.line(`M${f(w * 0.12)} ${f(y)} H${f(w * (0.5 + rnd() * 0.38))}`, i === 0 ? 1.2 : 0.6));
  }
  return out.join("");
};

const DRAWERS: Record<Motif, Draw> = {
  botanical: drawBotanical,
  architecture: drawArchitecture,
  landscape: drawLandscape,
  celestial: drawCelestial,
  book: drawBook,
  minimal: drawMinimal,
};

/** SVG completo da ilustração (texto, sem dados do utilizador no markup). */
export function renderIllustrationSvg(spec: Omit<GeneratedCover, "type">, size = { width: 640, height: 400 }): string {
  const { width: w, height: h } = size;
  const p = PALETTES[spec.collection];
  const rnd = mulberry32(hash(`${spec.prompt.trim().toLowerCase()}|${spec.seed}|${spec.collection}`));
  const pen = makePen(spec.style, p, rnd);
  const motif = motifFor(spec.prompt, spec.collection);
  const id = (hash(`${spec.seed}${spec.style}${spec.collection}${spec.prompt}`) % 1e6).toString(36);
  const defs = [
    `<pattern id="hatch-i" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" fill="${p.soft}"/><line x1="0" y1="0" x2="0" y2="5" stroke="${p.ink}" stroke-width="0.7" stroke-opacity="0.55"/></pattern>`,
    `<pattern id="hatch-a" width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(-35)"><rect width="4" height="4" fill="${p.paper}"/><line x1="0" y1="0" x2="0" y2="4" stroke="${p.accent}" stroke-width="0.9"/></pattern>`,
    `<filter id="wc" x="-10%" y="-10%" width="120%" height="120%"><feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="${spec.seed % 97}"/><feDisplacementMap in="SourceGraphic" scale="7"/><feGaussianBlur stdDeviation="0.8"/></filter>`,
    `<filter id="grain"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="1" seed="3"/><feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.06 0"/></filter>`,
  ].join("");
  const background =
    spec.style === "esboco"
      ? `<rect width="${w}" height="${h}" fill="${p.paper}"/>` +
        Array.from(
          { length: Math.ceil(w / 24) },
          (_, i) => `<line x1="${i * 24}" y1="0" x2="${i * 24}" y2="${h}" stroke="${p.accent}" stroke-opacity="0.08"/>`,
        ).join("") +
        Array.from(
          { length: Math.ceil(h / 24) },
          (_, i) => `<line x1="0" y1="${i * 24}" x2="${w}" y2="${i * 24}" stroke="${p.accent}" stroke-opacity="0.08"/>`,
        ).join("")
      : `<rect width="${w}" height="${h}" fill="${p.paper}"/>`;
  const frame =
    spec.collection === "ex-libris"
      ? `<rect x="10" y="10" width="${w - 20}" height="${h - 20}" fill="none" stroke="${p.ink}" stroke-width="1.4"/><rect x="16" y="16" width="${w - 32}" height="${h - 32}" fill="none" stroke="${p.ink}" stroke-width="0.6"/>`
      : "";
  // Os ids são locais a cada SVG (prefixo), para várias capas na mesma página.
  const body = `${background}${DRAWERS[motif](pen, rnd, w, h)}${frame}<rect width="${w}" height="${h}" filter="url(#grain)" opacity="0.9"/>`;
  const scoped = `<defs>${defs}</defs>${body}`
    .replace(/id="([\w-]+)"/g, `id="$1-${id}"`)
    .replace(/url\(#([\w-]+)\)/g, `url(#$1-${id})`);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" role="img">${scoped}</svg>`;
}

/** Data URL da ilustração (para <img> e exportações). */
export function illustrationDataUrl(
  spec: Omit<GeneratedCover, "type">,
  size?: { width: number; height: number },
): string {
  const svg = renderIllustrationSvg(spec, size);
  const encoded =
    typeof Buffer !== "undefined"
      ? Buffer.from(svg, "utf8").toString("base64")
      : btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${encoded}`;
}

/** Fonte de imagem de qualquer capa. */
export function coverSrc(spec: CoverSpec, size?: { width: number; height: number }): string {
  return spec.type === "upload" ? spec.src : illustrationDataUrl(spec, size);
}

/** Semente nova a partir do relógio (cliente). */
export const freshSeed = () => Math.floor(Math.random() * 2 ** 30);

/** Gerador externo opcional (variáveis de ambiente, só no servidor). */
export interface IllustrationProviderInfo {
  external: boolean;
  label: string;
}
