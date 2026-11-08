/**
 * Vellum — useActivityTracker (Motor de Telemetria · Módulo 5)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Deteta atividade real (teclado, rato, roda, toque) e inatividade (Idle
 * Detection): ao fim de `idleMs` sem interação, ou com o separador oculto, a
 * contagem pausa. Chama `onActiveSecond` uma vez por segundo ativo e `onEdit`
 * por cada rajada de escrita em campos editáveis (inputs, textareas, editor).
 */
"use client";

import { useEffect, useRef, useState } from "react";

import { IDLE_TIMEOUT_MS } from "@/lib/telemetry";

/** Teclas seguidas com menos disto contam como a mesma edição. */
const EDIT_BURST_MS = 2000;
/** O movimento do rato só conta, no máximo, uma vez por este intervalo. */
const MOVE_THROTTLE_MS = 1000;

/** Chave de teste (Playwright) para encurtar o tempo de inatividade. */
export const IDLE_OVERRIDE_KEY = "vellum:idle-ms";

export interface ActivityTrackerOptions {
  onActiveSecond?: () => void;
  onEdit?: () => void;
  /** Mudança ativo ↔ pausa (por exemplo, para enviar o heartbeat ao pausar). */
  onStateChange?: (isActive: boolean) => void;
  idleMs?: number;
}

export interface ActivityTrackerState {
  isActive: boolean;
  /** Instante (ms) da última interação. */
  lastActivityAt: number;
  idleMs: number;
}

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  if (target instanceof HTMLTextAreaElement) return !target.readOnly && !target.disabled;
  if (target instanceof HTMLInputElement) {
    return !target.readOnly && !target.disabled && /^(text|search|email|url|number|)$/.test(target.type);
  }
  return false;
}

function resolveIdleMs(fallback: number): number {
  try {
    const override = Number(window.sessionStorage.getItem(IDLE_OVERRIDE_KEY));
    if (Number.isFinite(override) && override >= 1000) return override;
  } catch {
    // Armazenamento indisponível.
  }
  return fallback;
}

export function useActivityTracker(options: ActivityTrackerOptions = {}): ActivityTrackerState {
  const callbacks = useRef(options);
  callbacks.current = options;

  const [state, setState] = useState<ActivityTrackerState>({
    isActive: false,
    lastActivityAt: 0,
    idleMs: options.idleMs ?? IDLE_TIMEOUT_MS,
  });
  const lastActivity = useRef(0);
  const lastMove = useRef(0);
  const lastEdit = useRef(0);
  const active = useRef(false);

  useEffect(() => {
    const idleMs = resolveIdleMs(callbacks.current.idleMs ?? IDLE_TIMEOUT_MS);
    const mark = () => {
      lastActivity.current = Date.now();
    };
    const onMove = () => {
      const t = Date.now();
      if (t - lastMove.current < MOVE_THROTTLE_MS) return;
      lastMove.current = t;
      mark();
    };
    const onKey = (event: KeyboardEvent) => {
      mark();
      const isCharacter = event.key.length === 1 || event.key === "Backspace" || event.key === "Enter";
      if (event.metaKey || event.ctrlKey || !isCharacter) return;
      if (!isEditable(event.target)) return;
      const t = Date.now();
      if (t - lastEdit.current > EDIT_BURST_MS) callbacks.current.onEdit?.();
      lastEdit.current = t;
    };
    const update = () => {
      const isActive = document.visibilityState === "visible" && Date.now() - lastActivity.current < idleMs;
      if (isActive !== active.current) {
        active.current = isActive;
        setState({ isActive, lastActivityAt: lastActivity.current, idleMs });
        callbacks.current.onStateChange?.(isActive);
      }
      return isActive;
    };

    const passive = { passive: true } as const;
    window.addEventListener("keydown", onKey, passive);
    window.addEventListener("pointerdown", mark, passive);
    window.addEventListener("pointermove", onMove, passive);
    window.addEventListener("wheel", mark, passive);
    window.addEventListener("touchstart", mark, passive);
    document.addEventListener("visibilitychange", update);
    const timer = window.setInterval(() => {
      if (update()) callbacks.current.onActiveSecond?.();
    }, 1000);
    setState((s) => ({ ...s, idleMs }));

    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", mark);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchstart", mark);
      document.removeEventListener("visibilitychange", update);
      window.clearInterval(timer);
    };
  }, []);

  return state;
}
