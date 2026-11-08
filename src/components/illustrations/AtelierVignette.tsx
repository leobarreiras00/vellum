/**
 * Vellum — <AtelierVignette /> · ilustração do topo do Atelier (Dashboard)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Vinheta da coleção escolhida (muda de semente a cada dia). O seletor ao lado
 * troca a coleção sem sair do Dashboard; a mesma escolha está nas Definições.
 */
"use client";

import { Check, Palette } from "lucide-react";
import { useMemo } from "react";

import { setIllustrationThemeAction } from "@/app/(workspace)/actions";
import { IllustrationArt } from "@/components/illustrations/IllustrationArt";
import { Popover, PopoverItem } from "@/components/ui/Popover";
import { useWorkspace } from "@/context/WorkspaceContext";
import { ILLUSTRATION_COLLECTIONS, collectionLabel, type GeneratedCover } from "@/lib/illustrations";

const VIGNETTE_PROMPT: Record<string, string> = {
  herbario: "ramo com folhas e flor",
  arquitetura: "fachada com arcos",
  "sumi-e": "montanha e bambu",
  celeste: "lua e constelação",
  "ex-libris": "livro aberto com pena",
  velino: "",
};

export function vignetteSpec(collection: GeneratedCover["collection"], day = new Date()): GeneratedCover {
  const seed = Math.floor(day.getTime() / 86_400_000) % 997;
  return {
    type: "generated",
    collection,
    style: collection === "sumi-e" ? "aguarela" : "gravura",
    prompt: VIGNETTE_PROMPT[collection] ?? "",
    seed,
  };
}

export function AtelierVignette() {
  const { snapshot, run } = useWorkspace();
  const collection = snapshot.profile.illustrationTheme;
  const spec = useMemo(() => vignetteSpec(collection), [collection]);

  return (
    <div className="flex items-end gap-2" data-testid="atelier-vignette">
      <div className="h-[104px] w-[240px] overflow-hidden rounded-xl border border-subtle shadow-paper">
        <IllustrationArt
          spec={spec}
          size={{ width: 480, height: 208 }}
          alt={`Ilustração: ${collectionLabel(collection)}`}
        />
      </div>
      <Popover
        label="Coleção de ilustrações"
        role="menu"
        align="end"
        panelClassName="w-[248px]"
        trigger={(props) => (
          <button
            type="button"
            {...props}
            title="Coleção de ilustrações"
            className="grid size-8 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary active:scale-[0.97]"
          >
            <Palette aria-hidden="true" className="size-4" strokeWidth={1.6} />
            <span className="sr-only">Escolher coleção de ilustrações</span>
          </button>
        )}
      >
        {(close) => (
          <div>
            <p className="eyebrow px-2.5 pb-1.5 pt-1">Coleção de ilustrações</p>
            {ILLUSTRATION_COLLECTIONS.map((c) => (
              <PopoverItem
                key={c.id}
                role="menuitemradio"
                aria-checked={c.id === collection}
                onClick={() => {
                  close();
                  if (c.id !== collection) {
                    void run(() => setIllustrationThemeAction(c.id), { success: `Coleção: ${c.label}.` });
                  }
                }}
              >
                <span className="flex-1">{c.label}</span>
                {c.id === collection && (
                  <Check aria-hidden="true" className="size-3.5 text-accent-primary" strokeWidth={1.6} />
                )}
              </PopoverItem>
            ))}
          </div>
        )}
      </Popover>
    </div>
  );
}
