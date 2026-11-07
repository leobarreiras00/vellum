/**
 * Vellum — <PenWritingIntro /> · Coreografia da Caneta SVG (ecrã de entrada)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Ver .claude/skills/motion-choreography.md §3.
 *
 *  Fase 1 · 0,0 s – 2,3 s  Escrita: o monograma e «Vellum» desenham-se traço a
 *                          traço (strokeDashoffset com pathLength=1) e um aparo de
 *                          caneta segue a ponta exata do traço (getPointAtLength),
 *                          inclinando nas curvas (tangente suavizada, ±25°).
 *  Fase 2 · 2,3 s – 2,9 s  Revelação: o aparo levanta-se e desvanece, a assinatura
 *                          reduz e sobe para o topo e o modal emerge com a curva
 *                          editorial cubic-bezier(0.22, 1, 0.36, 1).
 *
 * «Saltar introdução ↵» (ou Enter/Esc) termina de imediato; «Repetir animação da
 * caneta» volta a correr. Uma flag em sessionStorage evita repetir a intro em
 * recargas sucessivas. Com prefers-reduced-motion a assinatura surge estática.
 */
"use client";

import { RotateCcw } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

import { EASE_EDITORIAL, cn } from "@/lib/utils";

/* ==========================================================================
   Geometria da assinatura (viewBox em unidades SVG; linha de base y = 112)
   ========================================================================== */

/** Monograma: a folha de velino dobrada com um «V» de tinta (o glifo do VellumMark). */
const MONOGRAM_PATHS = [
  "M -42 50 Q -44 48 -40 48 H -18 L -3 62.5 V 99 Q -3 102 -6 102 H -40 Q -43 102 -43 99 Z",
  "M -18 48.5 V 60 Q -18 62.5 -15.5 62.5 H -3.5",
  "M -33.5 74 L -26 90.5 L -15.5 67.5",
] as const;

/** «V» maiúsculo com entrada em gancho (itálico a ~10°). */
const CAPITAL_V =
  "M 49.6 46 C 59.7 34 76.1 32 82 44 C 87.5 58 90.6 86 96.4 110 C 97.6 114 101.6 114 104.7 108 C 119.3 82 138.6 52 159.4 36 C 166.3 31 172.1 32 169 38";

/** «ellum» num único traço contínuo. */
const LOWERCASE =
  "M 144.8 96 C 154.5 98 171.5 92 174.9 84 C 178.3 76 166.7 74 159.3 82 C 149.2 94 148 112 164 112 C 176 112 187.8 102 197.9 90 C 213.4 70 229.6 46 227.4 36 C 224.8 28 211.7 34 206.9 50 C 198.7 74 193.4 104 204 112 C 211.3 116 221.4 104 231.9 90 C 247.4 70 263.6 46 261.4 36 C 258.8 28 245.7 34 240.9 50 C 232.7 74 227.4 104 238 112 C 245.3 116 255.4 104 263.5 92 C 268.6 86 270.9 84 272.9 84 C 268.8 96 262.7 108 272 112 C 281.6 114 292.5 98 298.9 84 C 294.5 98 290.4 110 300 112 C 306 112 311.4 104 316.8 96 C 321.9 90 326.9 84 330.9 84 C 331.5 92 325.4 104 322 112 C 328.5 98 338.9 84 348.9 84 C 356.9 84 352.1 100 348 112 C 354.5 98 364.9 84 374.9 84 C 384.9 84 380.1 100 376.7 108 C 375.6 114 383.6 114 393.1 106";

const STROKES = [...MONOGRAM_PATHS, CAPITAL_V, LOWERCASE] as const;

/** Ponto final em terracota, colocado pela caneta no fim. */
const FINAL_DOT = { cx: 404, cy: 110, r: 3.4 } as const;

const VIEWBOX = "-52 22 468 98";

/* ==========================================================================
   Tempos (ms)
   ========================================================================== */

const WRITE_START = 150;
const WRITE_END = 2150;
const PEN_LIFT = 70; // deslocação no ar entre traços
const DOT_TAP = 110; // descida e subida do aparo no ponto final
/** Fim da Fase 1: depois do ponto, a cena passa à revelação. */
const PHASE_ONE_END = 2300;
const REVEAL_DURATION = 0.6; // s (2,3 s → 2,9 s)

/** Inclinação base do aparo (caneta segura por mão direita) e limite das curvas. */
const NIB_BASE_ANGLE = 38;
const NIB_MAX_TILT = 25;

export const INTRO_SEEN_KEY = "vellum:intro-seen";

type Stage = "boot" | "writing" | "settled";

/* ==========================================================================
   Assinatura com aparo
   ========================================================================== */

interface SignatureProps {
  /** Quando verdadeiro, corre a escrita; caso contrário mostra-a completa. */
  play: boolean;
  /** Muda para reiniciar a escrita. */
  runId: number;
  /** Visível (falso no arranque, antes de se decidir se há intro). */
  visible: boolean;
  onWritten: () => void;
}

interface Segment {
  index: number;
  length: number;
  start: number;
  end: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function VellumSignature({ play, runId, visible, onWritten }: SignatureProps) {
  const inkRefs = useRef<Array<SVGPathElement | null>>([]);
  const shadeRefs = useRef<Array<SVGPathElement | null>>([]);
  const nibRef = useRef<SVGGElement | null>(null);
  const dotRef = useRef<SVGCircleElement | null>(null);
  const onWrittenRef = useRef(onWritten);
  const [penVisible, setPenVisible] = useState(false);

  useEffect(() => {
    onWrittenRef.current = onWritten;
  }, [onWritten]);

  const setStroke = useCallback((index: number, progress: number) => {
    const offset = String(1 - progress);
    const opacity = progress > 0 ? "1" : "0";
    for (const el of [inkRefs.current[index], shadeRefs.current[index]]) {
      if (!el) continue;
      el.style.strokeDashoffset = offset;
      el.style.opacity = opacity;
    }
  }, []);

  const setDot = useCallback((scale: number) => {
    dotRef.current?.setAttribute("r", String(FINAL_DOT.r * scale));
  }, []);

  // Estado estático (assinatura completa) quando não está a tocar.
  useLayoutEffect(() => {
    if (play) return;
    STROKES.forEach((_, i) => setStroke(i, 1));
    setDot(1);
    setPenVisible(false);
  }, [play, setStroke, setDot]);

  useLayoutEffect(() => {
    if (!play) return;

    const paths = inkRefs.current;
    const nib = nibRef.current;
    if (!nib || paths.some((p) => !p)) return;

    // Tempo de desenho proporcional ao comprimento de cada traço.
    const lengths = paths.map((p) => p!.getTotalLength());
    const totalLength = lengths.reduce((a, b) => a + b, 0);
    const drawBudget = WRITE_END - WRITE_START - PEN_LIFT * STROKES.length - DOT_TAP;
    const segments: Segment[] = [];
    let cursor = WRITE_START;
    lengths.forEach((length, index) => {
      if (index > 0) cursor += PEN_LIFT;
      const duration = (length / totalLength) * drawBudget;
      segments.push({ index, length, start: cursor, end: cursor + duration });
      cursor += duration;
    });
    const dotStart = cursor + PEN_LIFT;

    STROKES.forEach((_, i) => setStroke(i, 0));
    setDot(0);
    setPenVisible(true);

    let tilt = 0;
    let frame = 0;
    let finished = false;
    const startedAt = performance.now();

    const pointOf = (index: number, at: number) => {
      const path = paths[index]!;
      return path.getPointAtLength(clamp(at, 0, lengths[index]!));
    };

    const placeNib = (x: number, y: number, targetTilt: number, lift = 0) => {
      tilt += (targetTilt - tilt) * 0.16; // suavização da inclinação
      nib.setAttribute(
        "transform",
        `translate(${x.toFixed(2)} ${(y - lift).toFixed(2)}) rotate(${(NIB_BASE_ANGLE + tilt).toFixed(2)})`,
      );
    };

    const tick = (now: number) => {
      const t = now - startedAt;

      // 1. Traços: progresso de cada segmento.
      let active: Segment | undefined;
      for (const seg of segments) {
        const progress = clamp((t - seg.start) / (seg.end - seg.start), 0, 1);
        setStroke(seg.index, progress);
        if (t >= seg.start && t < seg.end) active = seg;
      }

      if (active) {
        // 2. O aparo segue a ponta exata do traço.
        const at = ((t - active.start) / (active.end - active.start)) * active.length;
        const tip = pointOf(active.index, at);
        const ahead = pointOf(active.index, at + 1.5);
        const behind = pointOf(active.index, at - 1.5);
        const theta = Math.atan2(ahead.y - behind.y, ahead.x - behind.x);
        // A descer inclina para a direita, a subir para a esquerda (mão que acompanha a curva).
        const target = clamp(16 * Math.sin(theta) - 5 * Math.cos(theta), -NIB_MAX_TILT, NIB_MAX_TILT);
        placeNib(tip.x, tip.y, target);
      } else if (t < WRITE_START) {
        const first = pointOf(0, 0);
        placeNib(first.x, first.y, 0, (1 - t / WRITE_START) * 6);
      } else if (t < dotStart + DOT_TAP) {
        // 3. No ar entre traços (ou a caminho do ponto final): arco suave.
        const previous = [...segments].reverse().find((s) => t >= s.end);
        const next = segments.find((s) => t < s.start);
        const from = previous ? pointOf(previous.index, previous.length) : pointOf(0, 0);
        const to = next ? pointOf(next.index, 0) : { x: FINAL_DOT.cx, y: FINAL_DOT.cy };
        const departAt = previous ? previous.end : WRITE_START;
        const arriveAt = next ? next.start : dotStart;
        if (t < arriveAt) {
          const k = easeInOut(clamp((t - departAt) / (arriveAt - departAt), 0, 1));
          placeNib(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k, 0, Math.sin(k * Math.PI) * 5);
        } else {
          // Toque do ponto final.
          const k = clamp((t - dotStart) / DOT_TAP, 0, 1);
          placeNib(FINAL_DOT.cx, FINAL_DOT.cy, 0, Math.sin(k * Math.PI) * -1.2);
          setDot(easeInOut(k));
        }
      } else {
        setDot(1);
        placeNib(FINAL_DOT.cx, FINAL_DOT.cy, 0);
      }

      if (t >= PHASE_ONE_END) {
        if (!finished) {
          finished = true;
          setPenVisible(false);
          onWrittenRef.current();
        }
        return;
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [play, runId, setStroke, setDot]);

  const strokeProps = {
    pathLength: 1,
    strokeDasharray: "1 2",
    style: { strokeDashoffset: 1, opacity: 0 },
  } as const;

  return (
    <svg
      viewBox={VIEWBOX}
      role="img"
      aria-label="Vellum"
      overflow="visible"
      className={cn("block h-auto w-full transition-opacity duration-300", visible ? "opacity-100" : "opacity-0")}
    >
      <g fill="none" strokeLinecap="round" strokeLinejoin="round" className="stroke-primary">
        {/* Segunda passagem desviada: dá ao traço a modulação de um aparo largo. */}
        <g strokeWidth={1.7} transform="translate(1.05 -1.05)" opacity={0.92}>
          {STROKES.map((d, i) => (
            <path
              key={`shade-${i}`}
              ref={(el) => {
                shadeRefs.current[i] = el;
              }}
              d={d}
              {...strokeProps}
            />
          ))}
        </g>
        <g strokeWidth={2}>
          {STROKES.map((d, i) => (
            <path
              key={`ink-${i}`}
              ref={(el) => {
                inkRefs.current[i] = el;
              }}
              d={d}
              {...strokeProps}
            />
          ))}
        </g>
      </g>

      <circle ref={dotRef} cx={FINAL_DOT.cx} cy={FINAL_DOT.cy} r={0} className="fill-accent-primary" />

      {/* Aparo: levanta-se (x +12, y −12) e desvanece no fim da escrita. */}
      <motion.g
        initial={false}
        animate={penVisible ? { opacity: 1, x: 0, y: 0 } : { opacity: 0, x: 12, y: -12 }}
        transition={{ duration: penVisible ? 0.15 : 0.32, ease: EASE_EDITORIAL }}
        aria-hidden="true"
      >
        <g ref={nibRef} transform={`translate(${-34} 50) rotate(${NIB_BASE_ANGLE})`}>
          <FountainPenNib />
        </g>
      </motion.g>
    </svg>
  );
}

/**
 * Aparo de caneta de tinta permanente, com a ponta em (0, 0) e o corpo a subir
 * no eixo −y. Carvão (tinta do tema) e ouro/terracota (acento do tema).
 */
function FountainPenNib() {
  return (
    <g transform="scale(0.72)">
      {/* Sombra de contacto quente sob a ponta */}
      <ellipse cx={1} cy={1.5} rx={3.2} ry={1.2} className="fill-primary" opacity={0.12} />
      {/* Corpo da caneta (carvão), cortado pelo enquadramento */}
      <path d="M -10.5 -66 L -10.5 -118 Q -10.5 -124 -4.5 -124 L 4.5 -124 Q 10.5 -124 10.5 -118 L 10.5 -66 Z" className="fill-primary" />
      <path d="M -6.5 -70 L -6.5 -118" className="stroke-elevated" strokeWidth={1.1} strokeLinecap="round" opacity={0.28} />
      {/* Anel de ouro */}
      <rect x={-11.5} y={-68} width={23} height={4.5} rx={1.2} className="fill-accent-primary" />
      <rect x={-11.5} y={-68} width={23} height={1.2} rx={0.6} className="fill-elevated" opacity={0.35} />
      {/* Secção (pega) */}
      <path d="M -9.5 -63.5 L -8.2 -44 L 8.2 -44 L 9.5 -63.5 Z" className="fill-primary" />
      <path d="M -8.4 -50 L 8.4 -50" className="stroke-elevated" strokeWidth={0.6} opacity={0.2} />
      {/* Aparo (ouro/terracota) */}
      <path
        d="M 0 0 C -2.6 -6.5 -8.6 -20 -9.2 -33 L -8.6 -45 L 8.6 -45 L 9.2 -33 C 8.6 -20 2.6 -6.5 0 0 Z"
        className="fill-accent-primary stroke-primary"
        strokeWidth={0.7}
        strokeLinejoin="round"
      />
      {/* Ombros gravados */}
      <path d="M -6.6 -36 Q 0 -31.5 6.6 -36" fill="none" className="stroke-primary" strokeWidth={0.6} opacity={0.55} />
      <path d="M -5.4 -40 Q 0 -36.5 5.4 -40" fill="none" className="stroke-primary" strokeWidth={0.5} opacity={0.35} />
      {/* Fenda e orifício de respiração */}
      <path d="M 0 -0.6 L 0 -24" className="stroke-primary" strokeWidth={0.8} strokeLinecap="round" />
      <circle cx={0} cy={-26.5} r={2.1} className="fill-primary" />
      {/* Brilho do metal */}
      <path d="M -5.6 -30 C -5 -20 -2.6 -10 -0.9 -4" fill="none" className="stroke-elevated" strokeWidth={0.9} strokeLinecap="round" opacity={0.45} />
      {/* Gota de tinta na ponta */}
      <circle cx={0} cy={-0.4} r={0.9} className="fill-primary" />
    </g>
  );
}

/* ==========================================================================
   Linhas guia editoriais (papel pautado, quase impercetível)
   ========================================================================== */

function EditorialGuides() {
  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-0 opacity-30">
      <svg className="size-full" preserveAspectRatio="none">
        <defs>
          <pattern id="vellum-ruling" width="32" height="32" patternUnits="userSpaceOnUse">
            <line x1="0" y1="31.5" x2="32" y2="31.5" className="stroke-subtle" strokeWidth={1} strokeOpacity={0.55} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#vellum-ruling)" />
      </svg>
      {/* Margem vertical, como num caderno de escrita */}
      <div className="absolute inset-y-0 left-[8%] w-px bg-accent-primary/25 md:left-[12%]" />
      <div className="absolute inset-y-0 right-[8%] w-px bg-subtle/70 md:right-[12%]" />
    </div>
  );
}

/* ==========================================================================
   Cena
   ========================================================================== */

interface PenWritingIntroProps {
  /** O modal de autenticação, revelado na Fase 2. */
  children: ReactNode;
  /** Rodapé da página (ex.: <AppFooter variant="full" />), revelado com o modal. */
  footer?: ReactNode;
}

export function PenWritingIntro({ children, footer }: PenWritingIntroProps) {
  const prefersReducedMotion = useReducedMotion();
  const [stage, setStage] = useState<Stage>("boot");
  const [runId, setRunId] = useState(0);
  const [instant, setInstant] = useState(true);

  const markSeen = useCallback(() => {
    try {
      window.sessionStorage.setItem(INTRO_SEEN_KEY, "1");
    } catch {
      // sessionStorage indisponível: a intro volta a correr na próxima recarga.
    }
  }, []);

  // Arranque: decide se há intro (primeira visita na sessão e sem movimento reduzido).
  useEffect(() => {
    let seen = false;
    try {
      seen = window.sessionStorage.getItem(INTRO_SEEN_KEY) === "1";
    } catch {
      seen = false;
    }
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (seen || reduced) {
      setInstant(true);
      setStage("settled");
    } else {
      setInstant(false);
      setStage("writing");
    }
  }, []);

  const settle = useCallback(() => {
    markSeen();
    setInstant(Boolean(prefersReducedMotion));
    setStage("settled");
  }, [markSeen, prefersReducedMotion]);

  const replay = useCallback(() => {
    if (prefersReducedMotion) return;
    window.scrollTo({ top: 0 });
    setInstant(false);
    setRunId((n) => n + 1);
    setStage("writing");
  }, [prefersReducedMotion]);

  // Enter ou Esc saltam a introdução.
  useEffect(() => {
    if (stage !== "writing") return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" || event.key === "Escape") {
        event.preventDefault();
        settle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [stage, settle]);

  const isIntro = stage !== "settled";
  const layoutTransition = instant ? { duration: 0 } : { duration: REVEAL_DURATION, ease: EASE_EDITORIAL };

  return (
    <div className="relative flex min-h-dvh flex-col">
      <EditorialGuides />

      {/* Saltar introdução */}
      <AnimatePresence>
        {stage === "writing" && (
          <motion.button
            key="skip"
            type="button"
            onClick={settle}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0, transition: { delay: 0.4, duration: 0.25, ease: EASE_EDITORIAL } }}
            exit={{ opacity: 0, transition: { duration: 0.15 } }}
            className="fixed right-4 top-4 z-20 inline-flex h-8 items-center gap-2 rounded-lg px-3 text-xs text-muted transition-colors duration-150 ease-editorial hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas md:right-6 md:top-6"
          >
            Saltar introdução
            <kbd aria-hidden="true">↵</kbd>
          </motion.button>
        )}
      </AnimatePresence>

      <main
        className={cn(
          "relative z-10 flex flex-1 flex-col items-center px-4",
          isIntro ? "justify-center py-10" : "justify-start pb-16 pt-10 md:pt-14",
        )}
      >
        <motion.div
          layout
          transition={{ layout: layoutTransition }}
          className={cn("relative z-20", isIntro ? "w-[min(680px,84vw)]" : "w-[min(232px,58vw)]")}
        >
          <h1 className="sr-only">Vellum — Entrar</h1>
          <VellumSignature
            play={stage === "writing" && !prefersReducedMotion}
            runId={runId}
            visible={stage !== "boot"}
            onWritten={settle}
          />
        </motion.div>

        <AnimatePresence>
          {stage === "settled" && (
            <motion.div
              key="reveal"
              className="mt-6 flex w-full flex-col items-center md:mt-8"
              initial={instant ? false : { opacity: 0, y: 40, scale: 0.985 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: REVEAL_DURATION - 0.12, ease: EASE_EDITORIAL, delay: instant ? 0 : 0.12 }}
            >
              {children}

              {!prefersReducedMotion && (
                <button
                  type="button"
                  onClick={replay}
                  className="mt-5 inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs text-muted transition-colors duration-150 ease-editorial hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  <RotateCcw aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
                  Repetir animação da caneta
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <AnimatePresence>
        {stage === "settled" && footer && (
          <motion.div
            key="footer"
            className="relative z-10 bg-canvas"
            initial={instant ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, ease: EASE_EDITORIAL, delay: instant ? 0 : 0.35 }}
          >
            {footer}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
