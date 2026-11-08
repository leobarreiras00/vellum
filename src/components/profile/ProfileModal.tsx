/**
 * Vellum — <ProfileModal /> · Perfil do utilizador (Bloco 6)
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Abre-se a partir do avatar ou do nome (Sidebar e Topbar) com `openProfile()`.
 * Fotografia PNG/JPEG/WEBP até 2 MB: ao escolher, é logo redimensionada em
 * Canvas para 256×256 WEBP (qualidade 0,85) e mostrada no círculo; o
 * enquadramento pode ser ajustado (zoom e arrasto). Tudo é gravado ao clicar
 * em «Guardar perfil»: a fotografia vai para a base de dados (user_profile) e
 * para o AuthContext + localStorage (nunca para o cookie). O servidor volta a
 * validar o tipo pelos bytes e o tamanho. Campos com rótulos visíveis,
 * alinhados na horizontal (ux-forms-psychology).
 */
"use client";

import { Camera, Check, Trash2, Upload } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import {
  changePasswordAction,
  updateAvatarAction,
  updatePreferencesAction,
  updateProfileAction,
} from "@/app/(workspace)/actions";
import { useShell } from "@/components/layout/ShellContext";
import { useTheme } from "@/components/providers/ThemeProvider";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { FieldError, Input, Label, Select, Textarea } from "@/components/ui/Field";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useAuth } from "@/context/AuthContext";
import { useWorkspace } from "@/context/WorkspaceContext";
import { avatarFileError, cropAvatar, readAsDataUrl } from "@/lib/image-tools";
import { formatClock, normalizeClock } from "@/lib/input-masks";
import type { ThemeId } from "@/lib/themes";
import { cn } from "@/lib/utils";

const OPEN_EVENT = "vellum:profile";

export function openProfile() {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function ProfileModalHost() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);
  return (
    <Dialog
      open={open}
      onClose={() => setOpen(false)}
      eyebrow="Perfil"
      title="O seu perfil"
      description="Como aparece no atelier, nos comentários e nas partilhas."
      size="lg"
    >
      {open && <ProfileForm />}
    </Dialog>
  );
}

/**
 * Fotografia do utilizador atual. A base de dados (instantâneo do workspace) é a
 * fonte de verdade; o AuthContext + localStorage guardam a cópia global.
 */
export function useCurrentAvatar(): string | null {
  const { user, avatarUrl, setAvatarUrl } = useAuth();
  const { snapshot } = useWorkspace();
  const member = snapshot.members.find((m) => m.userId === user?.userId);
  const server = member ? (member.avatar ?? snapshot.profile.avatar ?? null) : undefined;
  useEffect(() => {
    if (server !== undefined && server !== avatarUrl) setAvatarUrl(server);
  }, [server, avatarUrl, setAvatarUrl]);
  return server !== undefined ? server : avatarUrl;
}

/* ==========================================================================
   Formulário
   ========================================================================== */

function ProfileForm() {
  const { user, setUser, setAvatarUrl } = useAuth();
  const { snapshot, run } = useWorkspace();
  const avatar = useCurrentAvatar();
  const ids = {
    name: useId(),
    username: useId(),
    email: useId(),
    title: useId(),
    bio: useId(),
    theme: useId(),
    goal: useId(),
  };
  const { themes, theme } = useTheme();
  const { chooseTheme } = useShell();
  const [values, setValues] = useState({
    name: user?.name ?? "",
    username: user?.username ?? "",
    title: snapshot.profile.title,
    bio: snapshot.profile.bio,
  });
  const [goal, setGoal] = useState(() => minutesToClock(snapshot.preferences.dailyGoalMinutes));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();
  /** Fotografia por gravar: `undefined` = sem alterações; `null` = remover. */
  const [draftAvatar, setDraftAvatar] = useState<string | null | undefined>(undefined);

  if (!user) return null;

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  function save(event: React.FormEvent) {
    event.preventDefault();
    setSaved(false);
    const clock = normalizeClock(goal);
    const minutes = clock ? clockToMinutes(clock) : NaN;
    if (!clock || minutes < 15 || minutes > 16 * 60) {
      setErrors({ goal: "Indique a meta em HH:MM, entre 00:15 e 16:00." });
      return;
    }
    setErrors({});
    start(async () => {
      if (draftAvatar !== undefined) {
        const photo = await run(() => updateAvatarAction(draftAvatar), { silent: true });
        if (!photo.ok) {
          setErrors({ avatar: photo.error ?? "Não foi possível guardar a fotografia. Tente de novo." });
          return;
        }
        setAvatarUrl(draftAvatar);
        setDraftAvatar(undefined);
      }
      const result = await run(() => updateProfileAction(values), { silent: true });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? { form: result.error });
        return;
      }
      setUser(result.data);
      if (minutes !== snapshot.preferences.dailyGoalMinutes) {
        await run(() => updatePreferencesAction({ dailyGoalMinutes: minutes }), { silent: true });
      }
      setSaved(true);
    });
  }

  return (
    <div className="grid gap-8 md:grid-cols-[220px_1fr]">
      <AvatarEditor
        initials={user.initials}
        name={user.name}
        avatar={draftAvatar !== undefined ? draftAvatar : avatar}
        dirty={draftAvatar !== undefined}
        saveError={errors.avatar}
        onChange={(dataUrl) => {
          setSaved(false);
          setDraftAvatar(dataUrl === avatar ? undefined : dataUrl);
        }}
      />

      <div className="min-w-0 space-y-8">
        <form onSubmit={save} noValidate className="space-y-4" data-testid="profile-form">
          {errors.form && (
            <p role="alert" className="rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
              {errors.form}
            </p>
          )}
          <Row label="Nome completo" htmlFor={ids.name} error={errors.name}>
            <Input
              id={ids.name}
              value={values.name}
              onChange={set("name")}
              autoComplete="name"
              aria-invalid={!!errors.name}
            />
          </Row>
          <Row label="Username" htmlFor={ids.username} error={errors.username}>
            <div className="relative">
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-0 left-3 grid place-items-center text-sm text-muted"
              >
                @
              </span>
              <Input
                id={ids.username}
                value={values.username}
                onChange={set("username")}
                autoCapitalize="none"
                spellCheck={false}
                autoComplete="username"
                className="pl-7"
                placeholder="leonardo_barreiras"
                aria-invalid={!!errors.username}
              />
            </div>
          </Row>
          <Row label="Email" htmlFor={ids.email} hint="Para mudar o email da conta, contacte o Suporte.">
            <Input
              id={ids.email}
              value={user.email}
              readOnly
              aria-readonly="true"
              className="bg-surface/60 text-muted"
            />
          </Row>
          <Row label="Cargo" htmlFor={ids.title} error={errors.title}>
            <Input
              id={ids.title}
              value={values.title}
              onChange={set("title")}
              placeholder="ex.: Editor-chefe"
              maxLength={80}
            />
          </Row>
          <Row label="Bio" htmlFor={ids.bio} error={errors.bio} align="start">
            <Textarea
              id={ids.bio}
              value={values.bio}
              onChange={set("bio")}
              rows={3}
              maxLength={400}
              placeholder="Duas linhas sobre o que escreve e organiza."
            />
            <p className="nums mt-1 text-right text-[11px] text-muted">{values.bio.length} / 400</p>
          </Row>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor={ids.theme}>Tema preferido</Label>
              <Select id={ids.theme} value={theme} onChange={(e) => chooseTheme(e.target.value as ThemeId)}>
                {themes.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor={ids.goal}>Meta diária (HH:MM)</Label>
              <Input
                id={ids.goal}
                value={goal}
                inputMode="numeric"
                placeholder="04:00"
                className="nums w-[96px]"
                onChange={(e) => setGoal(formatClock(e.target.value))}
                aria-invalid={!!errors.goal}
                aria-describedby={errors.goal ? `${ids.goal}-err` : undefined}
              />
              <FieldError id={`${ids.goal}-err`}>{errors.goal}</FieldError>
            </div>
          </div>
          <div className="flex items-center justify-end gap-3 pt-1">
            {saved && (
              <span role="status" className="inline-flex items-center gap-1 text-sm text-success">
                <Check aria-hidden="true" className="size-4" strokeWidth={1.6} />
                Perfil guardado
              </span>
            )}
            <Button type="submit" variant="primary" disabled={pending} data-testid="profile-save">
              {pending ? "A guardar…" : "Guardar perfil"}
            </Button>
          </div>
        </form>

        <PasswordSection />
      </div>
    </div>
  );
}

function Row({
  label,
  htmlFor,
  error,
  hint,
  align = "center",
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  align?: "center" | "start";
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid gap-1.5 sm:grid-cols-[120px_1fr] sm:gap-4",
        align === "center" ? "sm:items-center" : "sm:items-start",
      )}
    >
      <Label htmlFor={htmlFor} className={cn("mb-0", align === "start" && "sm:pt-2.5")}>
        {label}
      </Label>
      <div className="min-w-0">
        {children}
        {hint && <p className="mt-1 text-[11px] text-muted">{hint}</p>}
        <FieldError>{error}</FieldError>
      </div>
    </div>
  );
}

/* ==========================================================================
   Fotografia: carregar, recortar (1:1, zoom, arrastar), remover
   ========================================================================== */

const STAGE = 208;

function AvatarEditor({
  initials,
  name,
  avatar,
  dirty,
  saveError,
  onChange,
}: {
  initials: string;
  name: string;
  /** O que se vê no círculo: a fotografia gravada ou a que está por gravar. */
  avatar: string | null;
  dirty: boolean;
  saveError?: string;
  onChange: (dataUrl: string | null) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const zoomId = useId();
  /** Imagem original escolhida (para reenquadrar) e se o recorte está aberto. */
  const [original, setOriginal] = useState<{ src: string; w: number; h: number } | null>(null);
  const [framing, setFraming] = useState(false);
  const source = framing ? original : null;
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  async function pick(file: File | undefined) {
    if (!file) return;
    const problem = avatarFileError(file);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    const src = await readAsDataUrl(file);
    const img = new Image();
    img.onload = () => {
      setOriginal({ src, w: img.naturalWidth, h: img.naturalHeight });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
      // Pré-visualização imediata: recorte central 256×256 WEBP no círculo.
      cropAvatar(src, 1, 0, 0)
        .then(onChange)
        .catch(() => setError("Não foi possível processar a fotografia neste navegador."));
    };
    img.onerror = () => setError("Não foi possível ler esta imagem. Experimente outro ficheiro.");
    img.src = src;
  }

  // Geometria da pré-visualização: o lado menor preenche o palco, ampliado pelo zoom.
  const base = source ? STAGE / Math.min(source.w, source.h) : 1;
  const dispW = source ? source.w * base * zoom : STAGE;
  const dispH = source ? source.h * base * zoom : STAGE;
  const slackX = (dispW - STAGE) / 2;
  const slackY = (dispH - STAGE) / 2;
  const left = -slackX - offset.x * slackX;
  const top = -slackY - offset.y * slackY;

  function onPointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const clamp = (v: number) => Math.max(-1, Math.min(1, v));
    setOffset({
      x: slackX > 0 ? clamp(drag.current.ox - dx / slackX) : 0,
      y: slackY > 0 ? clamp(drag.current.oy - dy / slackY) : 0,
    });
  }
  function onKeyDown(e: React.KeyboardEvent) {
    const step = 0.1;
    const map: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = map[e.key];
    if (!move) return;
    e.preventDefault();
    setOffset((o) => ({
      x: Math.max(-1, Math.min(1, o.x + move[0])),
      y: Math.max(-1, Math.min(1, o.y + move[1])),
    }));
  }

  async function apply() {
    if (!source) return;
    setBusy(true);
    try {
      const dataUrl = await cropAvatar(source.src, zoom, offset.x, offset.y);
      onChange(dataUrl);
      setFraming(false);
    } catch {
      setError("Não foi possível processar a fotografia neste navegador.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Fotografia de perfil"
      className="flex flex-col items-center text-center md:items-start md:text-left"
    >
      <p className="eyebrow">Fotografia</p>
      {source ? (
        <>
          <div
            className="relative mt-3 cursor-grab touch-none overflow-hidden rounded-xl border border-subtle bg-surface active:cursor-grabbing focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            style={{ width: STAGE, height: STAGE }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={() => (drag.current = null)}
            onKeyDown={onKeyDown}
            tabIndex={0}
            role="img"
            aria-label="Recorte da fotografia: arraste ou use as setas para enquadrar"
            data-testid="avatar-crop"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização local */}
            <img
              src={source.src}
              alt=""
              draggable={false}
              className="pointer-events-none absolute max-w-none select-none"
              style={{ width: dispW, height: dispH, left, top }}
            />
            {/* máscara circular sobre o quadrado 1:1 */}
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_999px_rgb(var(--bg-canvas-rgb)/0.62)] ring-1 ring-primary/30"
            />
          </div>
          <div className="mt-3 w-full max-w-[208px]">
            <Label htmlFor={zoomId}>Zoom</Label>
            <input
              id={zoomId}
              type="range"
              min={1}
              max={3}
              step={0.01}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full accent-[rgb(var(--accent-primary-rgb))]"
            />
          </div>
          <div className="mt-3 flex gap-2">
            <Button size="sm" variant="secondary" onClick={apply} disabled={busy} data-testid="avatar-apply">
              {busy ? "A recortar…" : "Aplicar enquadramento"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setFraming(false)} disabled={busy}>
              Cancelar
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="mt-3 flex items-end gap-3" data-testid="avatar-preview">
            <UserAvatar user={{ name, initials, avatarUrl: avatar }} size="xl" />
            {avatar && <UserAvatar user={{ name, initials, avatarUrl: avatar }} size="md" />}
          </div>
          <div className="mt-4 flex flex-wrap justify-center gap-2 md:justify-start">
            <Button size="sm" variant="secondary" onClick={() => fileRef.current?.click()}>
              {avatar ? (
                <Camera aria-hidden="true" strokeWidth={1.6} />
              ) : (
                <Upload aria-hidden="true" strokeWidth={1.6} />
              )}
              {avatar ? "Trocar fotografia" : "Carregar fotografia"}
            </Button>
            {avatar && original && dirty && (
              <Button size="sm" variant="ghost" onClick={() => setFraming(true)} data-testid="avatar-frame">
                Ajustar enquadramento
              </Button>
            )}
            {avatar && (
              <Button size="sm" variant="ghost" onClick={() => onChange(null)} data-testid="avatar-remove">
                <Trash2 aria-hidden="true" strokeWidth={1.6} />
                Remover foto
              </Button>
            )}
          </div>
          {dirty ? (
            <p role="status" className="mt-2 text-[11px] leading-relaxed text-warning" data-testid="avatar-dirty">
              {avatar ? "Fotografia por guardar." : "Fotografia removida."} Clique em «Guardar perfil» para gravar.
            </p>
          ) : (
            <p className="mt-2 text-[11px] leading-relaxed text-muted">
              PNG, JPEG ou WEBP, até 2 MB. Fica guardada a 256×256.
            </p>
          )}
        </>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="sr-only"
        tabIndex={-1}
        aria-label="Escolher fotografia de perfil"
        data-testid="avatar-file"
        onChange={(e) => {
          void pick(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {(error ?? saveError) && (
        <p role="alert" className="mt-3 max-w-[220px] text-sm text-danger" data-testid="avatar-error">
          {error ?? saveError}
        </p>
      )}
    </section>
  );
}

/* ==========================================================================
   Palavra-passe
   ========================================================================== */

function PasswordSection() {
  const { run } = useWorkspace();
  const ids = { current: useId(), next: useId(), confirm: useId() };
  const [values, setValues] = useState({ current: "", password: "", confirm: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);
  const [pending, start] = useTransition();

  function submit(event: React.FormEvent) {
    event.preventDefault();
    setDone(false);
    start(async () => {
      const result = await run(() => changePasswordAction(values), { silent: true });
      if (!result.ok) {
        setErrors(result.fieldErrors ?? { form: result.error });
        return;
      }
      setErrors({});
      setValues({ current: "", password: "", confirm: "" });
      setDone(true);
    });
  }

  const field = (key: keyof typeof values) => ({
    value: values[key],
    type: "password" as const,
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => setValues((v) => ({ ...v, [key]: e.target.value })),
    "aria-invalid": !!errors[key],
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-4 border-t border-subtle pt-6" aria-labelledby="pw-title">
      <h3 id="pw-title" className="text-lg font-normal">
        Palavra-passe
      </h3>
      {errors.form && (
        <p role="alert" className="text-sm text-danger">
          {errors.form}
        </p>
      )}
      <Row label="Atual" htmlFor={ids.current} error={errors.current}>
        <Input id={ids.current} autoComplete="current-password" {...field("current")} />
      </Row>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor={ids.next}>Nova palavra-passe</Label>
          <Input id={ids.next} autoComplete="new-password" {...field("password")} />
          <FieldError>{errors.password}</FieldError>
        </div>
        <div>
          <Label htmlFor={ids.confirm}>Repetir a nova</Label>
          <Input id={ids.confirm} autoComplete="new-password" {...field("confirm")} />
          <FieldError>{errors.confirm}</FieldError>
        </div>
      </div>
      <div className="flex items-center justify-end gap-3">
        {done && (
          <span role="status" className="text-sm text-success">
            Palavra-passe mudada. As outras sessões foram terminadas.
          </span>
        )}
        <Button type="submit" variant="secondary" disabled={pending}>
          {pending ? "A mudar…" : "Mudar palavra-passe"}
        </Button>
      </div>
    </form>
  );
}

/* ==========================================================================
   Utilitários
   ========================================================================== */

function minutesToClock(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function clockToMinutes(clock: string): number {
  const [h, m] = clock.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}
