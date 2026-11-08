/**
 * Vellum — Logótipo
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Glifo: folha de velino com a orelha dobrada, o «V» do Newsreader recortado
 * a cor do papel e o ponto final no acento do tema (o mesmo desenho do
 * favicon, dos ícones da app e da imagem Open Graph — scripts/brand/).
 * Usa só tokens: a folha é `currentColor`, por isso inverte sozinha no
 * `dark-espresso`.
 */
import { cn } from "@/lib/utils";

interface VellumMarkProps {
  className?: string;
  /** Mostra apenas o glifo (folha dobrada), sem o nome. */
  glyphOnly?: boolean;
}

/** Contorno do «V» do Newsreader (opsz 72, peso 500), em unidades da fonte. */
const V_GLYPH =
  "M365 1372 220 1410 226 1430H720L714 1410L556 1374L694 210H670L1410 1367L1254 1410L1260 1430H1652L1646 1410L1475 1364L576 -20H540Z";

export function VellumMark({ className, glyphOnly = false }: VellumMarkProps) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-primary", className)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" className="size-[1.15em] shrink-0">
        {/* Folha com o canto superior direito dobrado */}
        <path className="fill-current" d="M5.2 2H16L21 7V19.8Q21 22 18.8 22H5.2Q3 22 3 19.8V4.2Q3 2 5.2 2Z" />
        <path className="fill-canvas opacity-40" d="M16 2V5.9Q16 7 17.1 7H21Z" />
        {/* «V» recortado na cor do papel */}
        <path className="fill-canvas" transform="translate(4.311 17.7) scale(0.006897 -0.006897)" d={V_GLYPH} />
        {/* Ponto final no acento */}
        <circle className="fill-accent-primary" cx="16.912" cy="16.57" r="1.05" />
      </svg>
      {!glyphOnly && (
        <span className="font-serif text-[1.15em] font-medium leading-none tracking-[-0.02em]">
          Vellum<span className="text-accent-primary">.</span>
        </span>
      )}
    </span>
  );
}
