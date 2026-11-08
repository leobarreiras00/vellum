/**
 * Vellum — Navegação e especímenes interativos do Design System
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * Nenhum botão morto: cada especímene leva a um sítio real do Vellum.
 */
"use client";

import { ArrowLeft, FilePlus2, Import, LogIn } from "lucide-react";
import Link from "next/link";
import { useId, useState } from "react";

import { VellumMark } from "@/components/layout/VellumMark";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Input, Label } from "@/components/ui/Field";
import { useAuth } from "@/context/AuthContext";
import { cn } from "@/lib/utils";

const SECTIONS = [
  ["tipografia", "Tipografia"],
  ["temas", "Temas"],
  ["tokens", "Tokens"],
  ["workspace", "Workspace"],
] as const;

export function DesignSystemNav() {
  const { user } = useAuth();
  return (
    <header className="liquid-glass-bar sticky top-0 z-30 border-b border-subtle">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-4 px-6 md:px-12">
        {user ? (
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
            data-testid="ds-back"
          >
            <ArrowLeft aria-hidden="true" strokeWidth={1.6} />
            Voltar ao Atelier
          </Link>
        ) : (
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "-ml-2")}
            data-testid="ds-back"
          >
            <LogIn aria-hidden="true" strokeWidth={1.6} />
            Entrar no Vellum
          </Link>
        )}
        <VellumMark className="text-lg" />
        <nav aria-label="Secções do Design System" className="ml-auto hidden items-center gap-1 sm:flex">
          {SECTIONS.map(([id, label]) => (
            <a
              key={id}
              href={`#${id}`}
              className="rounded-md px-2.5 py-1 text-xs text-muted transition-colors hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}

export function ButtonSpecimen() {
  const { user } = useAuth();
  const id = useId();
  const [title, setTitle] = useState("");
  const target = (href: string) => (user ? href : `/login?seguinte=${encodeURIComponent(href)}`);
  return (
    <div className="flex flex-wrap items-end gap-2">
      <Link href={target("/projects")} className={buttonVariants({ variant: "primary" })}>
        <FilePlus2 aria-hidden="true" strokeWidth={1.6} />
        Novo documento
      </Link>
      <Link href={target("/settings#sincronizacao")} className={buttonVariants({ variant: "secondary" })}>
        <Import aria-hidden="true" strokeWidth={1.6} />
        Importar
      </Link>
      <Button variant="ghost" onClick={() => setTitle("")} disabled={!title}>
        Cancelar
      </Button>
      <div>
        <Label htmlFor={id}>Título do documento</Label>
        <Input
          id={id}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="ex.: Manifesto"
          className="w-56"
        />
      </div>
    </div>
  );
}
