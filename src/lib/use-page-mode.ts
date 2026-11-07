/**
 * Vellum — Preferência de modo de página (Folha A4 / Fluido)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Preferência de apresentação por pessoa e dispositivo (localStorage), partilhada
 * entre o documento aberto e a barra de estado através de um evento de janela.
 * O modo é só apresentação: o JSON do documento é o mesmo nos dois modos.
 */
"use client";

import { useCallback, useEffect, useState } from "react";

import { PAGE_MODE_STORAGE_KEY, type PageMode } from "@/lib/page-mode";

const EVENT = "vellum:page-mode";

function read(): PageMode | null {
  try {
    const stored = window.localStorage.getItem(PAGE_MODE_STORAGE_KEY);
    return stored === "A4" || stored === "FLUID" ? stored : null;
  } catch {
    return null;
  }
}

export function usePageMode(initial: PageMode = "A4"): [PageMode, (mode: PageMode) => void] {
  const [mode, setMode] = useState<PageMode>(initial);

  useEffect(() => {
    const stored = read();
    if (stored) setMode(stored);
    const onChange = (event: Event) => {
      const next = (event as CustomEvent<PageMode>).detail;
      if (next === "A4" || next === "FLUID") setMode(next);
    };
    window.addEventListener(EVENT, onChange);
    return () => window.removeEventListener(EVENT, onChange);
  }, []);

  const change = useCallback((next: PageMode) => {
    setMode(next);
    try {
      window.localStorage.setItem(PAGE_MODE_STORAGE_KEY, next);
    } catch {
      // Armazenamento indisponível.
    }
    window.dispatchEvent(new CustomEvent<PageMode>(EVENT, { detail: next }));
  }, []);

  return [mode, change];
}
