/**
 * Vellum — Motor de Notificações e Lembretes (Módulo 4)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * As notificações derivam dos eventos do calendário (buildNotifications). O
 * estado «lido» e os alertas nativos já enviados ficam no dispositivo
 * (localStorage, por pessoa) e sincronizam entre componentes e separadores.
 */
"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";

import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { buildNotifications, dayLongLabel, timeRangeLabel, type CalendarNotification } from "@/lib/calendar";

const CHANGE_EVENT = "vellum:notifications";
const PERMISSION_EVENT = "vellum:notifications-permission";
const TICK_MS = 30_000;

type BrowserPermission = NotificationPermission | "unsupported";

function readSet(key: string): Set<string> {
  try {
    const raw = window.localStorage.getItem(key);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function writeSet(key: string, values: Set<string>) {
  try {
    // Guarda só os 300 mais recentes.
    window.localStorage.setItem(key, JSON.stringify([...values].slice(-300)));
  } catch {
    // Armazenamento indisponível.
  }
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function subscribe(callback: () => void) {
  window.addEventListener(CHANGE_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(CHANGE_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function useStoredSet(key: string): Set<string> {
  const raw = useSyncExternalStore(
    subscribe,
    () => {
      try {
        return window.localStorage.getItem(key) ?? "[]";
      } catch {
        return "[]";
      }
    },
    () => "[]",
  );
  return useMemo(() => new Set(JSON.parse(raw) as string[]), [raw]);
}

/** Relógio partilhado que avança a cada 30 s (as janelas dos lembretes mudam com o tempo). */
function useNow(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  return now;
}

function browserPermission(): BrowserPermission {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
  return window.Notification.permission;
}

export interface NotificationsState {
  items: CalendarNotification[];
  unreadCount: number;
  isRead: (id: string) => boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  permission: BrowserPermission;
  requestPermission: () => Promise<void>;
  now: number;
}

export function useNotifications(): NotificationsState {
  const { user } = useAuth();
  const { snapshot } = useWorkspace();
  const now = useNow();
  const readKey = `vellum:notif-read:${user?.userId ?? "anon"}`;
  const read = useStoredSet(readKey);
  const [permission, setPermission] = useState<BrowserPermission>("default");

  useEffect(() => setPermission(browserPermission()), []);

  const items = useMemo(() => buildNotifications(snapshot.events, now), [snapshot.events, now]);
  const unreadCount = items.filter((n) => n.isDue && !read.has(n.id)).length;

  const markRead = useCallback(
    (id: string) => {
      const next = readSet(readKey);
      next.add(id);
      writeSet(readKey, next);
    },
    [readKey],
  );

  const markAllRead = useCallback(() => {
    const next = readSet(readKey);
    for (const item of items) next.add(item.id);
    writeSet(readKey, next);
  }, [items, readKey]);

  const requestPermission = useCallback(async () => {
    if (browserPermission() === "unsupported") return;
    const result = await window.Notification.requestPermission();
    setPermission(result);
    // Avisa o motor de lembretes para verificar já, sem esperar pelo próximo ciclo.
    window.dispatchEvent(new Event(PERMISSION_EVENT));
  }, []);

  return {
    items,
    unreadCount,
    isRead: (id) => read.has(id),
    markRead,
    markAllRead,
    permission,
    requestPermission,
    now,
  };
}

/**
 * Envia alertas nativos (Notification API) quando um lembrete vence, uma vez
 * por lembrete e por dispositivo. Montado uma única vez, no App Shell.
 */
export function useEventReminders() {
  const { user } = useAuth();
  const { snapshot } = useWorkspace();
  const router = useRouter();
  const now = useNow();
  const sentKey = `vellum:notif-sent:${user?.userId ?? "anon"}`;
  const [permissionTick, setPermissionTick] = useState(0);

  useEffect(() => {
    const bump = () => setPermissionTick((t) => t + 1);
    window.addEventListener(PERMISSION_EVENT, bump);
    return () => window.removeEventListener(PERMISSION_EVENT, bump);
  }, []);

  useEffect(() => {
    if (browserPermission() !== "granted" || !user) return;
    const sent = readSet(sentKey);
    const byId = new Map(snapshot.events.map((e) => [e.id, e]));
    let changed = false;
    let fired = 0;
    for (const item of buildNotifications(snapshot.events, now)) {
      // Lembretes vencidos de eventos ainda por terminar; no máximo 3 por ciclo (sem rajadas ao abrir).
      if (!item.isDue || sent.has(item.id) || fired >= 3) continue;
      const event = byId.get(item.eventId);
      if (!event) continue;
      try {
        const alert = new window.Notification(
          item.kind === "important" ? `Dia importante: ${event.title}` : event.title,
          {
            body: `${dayLongLabel(event.date)} · ${timeRangeLabel(event)}`,
            tag: item.id,
          },
        );
        alert.onclick = () => {
          window.focus();
          router.push(`/calendar?dia=${event.date}`);
        };
      } catch {
        // Alguns navegadores (Android) só permitem notificações via Service Worker.
      }
      sent.add(item.id);
      changed = true;
      fired++;
    }
    if (changed) writeSet(sentKey, sent);
  }, [now, permissionTick, snapshot.events, sentKey, user, router]);
}
