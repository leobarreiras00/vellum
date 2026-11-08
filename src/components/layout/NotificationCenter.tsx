/**
 * Vellum — Centro de Notificações (sino da Topbar · Módulo 4)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Lembretes de eventos próximos e prazos de Dias Importantes, com estado
 * lido/por ler e ativação dos alertas nativos do navegador (Notification API).
 */
"use client";

import { Bell, BellRing, CalendarDays, Check, Star } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/Button";
import { InkDot } from "@/components/ui/Ink";
import { Popover } from "@/components/ui/Popover";
import { useWorkspace } from "@/context/WorkspaceContext";
import { useNotifications } from "@/hooks/useNotifications";
import {
  relativeDayLabel,
  relativeTimeLabel,
  timeRangeLabel,
  utcToKeyInLisbon,
  dayShortLabel,
  type CalendarNotification,
} from "@/lib/calendar";
import { cn } from "@/lib/utils";

export function NotificationCenter() {
  const { snapshot } = useWorkspace();
  const { items, unreadCount, isRead, markRead, markAllRead, permission, requestPermission, now } = useNotifications();
  const events = new Map(snapshot.events.map((e) => [e.id, e]));
  const legends = new Map(snapshot.legends.map((l) => [l.id, l]));
  const today = utcToKeyInLisbon(now);
  const reminders = items.filter((n) => n.kind === "reminder");
  const important = items.filter((n) => n.kind === "important");

  const renderItem = (item: CalendarNotification, close: () => void) => {
    const event = events.get(item.eventId);
    if (!event) return null;
    const legend = event.legendId ? legends.get(event.legendId) : undefined;
    const unread = item.isDue && !isRead(item.id);
    return (
      <li key={item.id}>
        <Link
          href={`/calendar?dia=${item.date}`}
          onClick={() => {
            markRead(item.id);
            close();
          }}
          data-unread={unread ? "true" : undefined}
          className="group flex gap-2.5 rounded-lg px-2.5 py-2 transition-colors duration-150 hover:bg-surface focus-visible:bg-surface focus-visible:outline-none"
        >
          <span className="mt-1.5 grid size-2 shrink-0 place-items-center" aria-hidden="true">
            {unread ? (
              <span className="size-2 rounded-full bg-accent-primary" />
            ) : legend ? (
              <InkDot color={legend.color} className="size-1.5" />
            ) : (
              <span className="size-1.5 rounded-full border border-muted" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={cn("block truncate text-sm", unread ? "font-medium text-primary" : "text-primary")}>
              {item.kind === "important" && (
                <Star
                  aria-hidden="true"
                  className="mr-1 inline size-3 -translate-y-px text-accent-primary"
                  strokeWidth={1.6}
                />
              )}
              {event.title}
            </span>
            <span className="nums block text-xs text-muted">
              {item.kind === "important"
                ? `${dayShortLabel(item.date)} · ${relativeDayLabel(item.date, today)}`
                : [
                    relativeDayLabel(item.date, today),
                    timeRangeLabel(event),
                    Math.abs(item.startMs - now) < 86_400_000 ? relativeTimeLabel(item.startMs, now) : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
            </span>
          </span>
          {unread && <span className="sr-only">(por ler)</span>}
        </Link>
      </li>
    );
  };

  return (
    <Popover
      label="Centro de notificações"
      align="end"
      panelClassName="w-[min(360px,calc(100vw-1.5rem))] p-0"
      trigger={(props) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={unreadCount > 0 ? `Notificações (${unreadCount} por ler)` : "Notificações"}
          title="Notificações"
          className="relative"
          {...props}
        >
          {unreadCount > 0 ? (
            <BellRing aria-hidden="true" strokeWidth={1.6} />
          ) : (
            <Bell aria-hidden="true" strokeWidth={1.6} />
          )}
          {unreadCount > 0 && (
            <span
              aria-hidden="true"
              data-testid="notification-badge"
              className="nums absolute -right-0.5 -top-0.5 grid h-3.5 min-w-3.5 place-items-center rounded-full bg-accent-primary px-[3px] font-mono text-[9px] leading-none text-canvas"
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      )}
    >
      {(close) => (
        <div className="flex max-h-[min(520px,75dvh)] flex-col">
          <div className="flex items-center justify-between gap-3 border-b border-subtle px-3.5 py-2.5">
            <p className="font-serif text-[17px]">Notificações</p>
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-muted transition-colors hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary disabled:opacity-50"
            >
              <Check aria-hidden="true" className="size-3" strokeWidth={1.6} />
              Marcar tudo como lido
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto p-1.5">
            <p className="eyebrow px-2.5 pb-1 pt-2">Lembretes de eventos</p>
            {reminders.length === 0 ? (
              <p className="px-2.5 pb-2 font-serif text-sm text-muted">Sem lembretes nos próximos 7 dias.</p>
            ) : (
              <ul aria-label="Lembretes de eventos">{reminders.map((n) => renderItem(n, close))}</ul>
            )}
            <p className="eyebrow px-2.5 pb-1 pt-3">Próximos dias importantes</p>
            {important.length === 0 ? (
              <p className="px-2.5 pb-2 font-serif text-sm text-muted">Nenhum marco nas próximas 3 semanas.</p>
            ) : (
              <ul aria-label="Próximos dias importantes">{important.map((n) => renderItem(n, close))}</ul>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-subtle bg-surface/60 px-3.5 py-2.5 text-xs">
            {permission === "granted" ? (
              <span className="inline-flex items-center gap-1.5 text-muted" data-testid="browser-alerts-state">
                <span aria-hidden="true" className="size-1.5 rounded-full bg-accent-primary" />
                Alertas do navegador ativos
              </span>
            ) : permission === "denied" ? (
              <span className="text-muted" data-testid="browser-alerts-state">
                Alertas bloqueados nas definições do navegador.
              </span>
            ) : permission === "unsupported" ? (
              <span className="text-muted" data-testid="browser-alerts-state">
                Este navegador não suporta alertas.
              </span>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => void requestPermission()}>
                <BellRing aria-hidden="true" strokeWidth={1.6} />
                Ativar alertas do navegador
              </Button>
            )}
            <Link
              href="/calendar"
              onClick={close}
              className="inline-flex items-center gap-1 rounded-md text-muted hover:text-accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <CalendarDays aria-hidden="true" className="size-3" strokeWidth={1.6} />
              Abrir calendário
            </Link>
          </div>
        </div>
      )}
    </Popover>
  );
}
