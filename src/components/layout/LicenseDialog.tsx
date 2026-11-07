/**
 * Vellum — Diálogo de consulta da Licença Proprietária
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
"use client";

import { ArrowUpRight, Scale, X } from "lucide-react";
import { useRef, type ReactNode } from "react";

import { REPOSITORY_URL, cn } from "@/lib/utils";

const PERMITTED = [
  "Ler e visualizar o código-fonte na plataforma onde está alojado.",
  "Referenciar o projeto, com hiperligação e atribuição explícita ao Autor, em contextos de análise, recrutamento, avaliação técnica ou divulgação.",
];

const PROHIBITED = [
  "Copiar, reproduzir ou clonar o Software para qualquer fim comercial ou de produção.",
  "Redistribuir, sublicenciar, vender, alugar ou ceder o Software a terceiros.",
  "Modificar, adaptar ou criar obras derivadas do Software, da sua arquitetura, design ou identidade visual.",
  "Alojar, executar ou oferecer o Software como serviço (SaaS).",
  "Remover, ocultar ou alterar avisos de direitos de autor, créditos ou rodapés.",
  "Usar o nome «Vellum» ou o nome do Autor para promover produtos de terceiros.",
  "Utilizar o Software para treinar, afinar ou avaliar modelos de inteligência artificial.",
];

interface LicenseDialogProps {
  className?: string;
  children?: ReactNode;
}

export function LicenseDialog({ className, children }: LicenseDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md text-muted underline-offset-4 transition-colors duration-150 ease-editorial hover:text-accent-primary hover:underline",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          className,
        )}
      >
        {children ?? (
          <>
            <Scale aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
            Licença Proprietária
          </>
        )}
      </button>

      <dialog
        ref={dialogRef}
        aria-labelledby="vellum-license-title"
        className="dialog-editorial"
        onClick={(event) => {
          // Fecha ao clicar no fundo (fora da folha).
          if (event.target === dialogRef.current) dialogRef.current.close();
        }}
      >
        <div className="flex max-h-[85dvh] flex-col">
          <header className="flex items-start justify-between gap-6 border-b border-subtle px-7 pb-5 pt-6">
            <div>
              <p className="eyebrow">Documento legal · PT-PT</p>
              <h2 id="vellum-license-title" className="mt-2 text-2xl leading-snug">
                Licença Proprietária de Código Visível
              </h2>
              <p className="mt-1 font-serif text-base italic text-muted">Todos os direitos reservados.</p>
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Fechar"
              className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors duration-150 hover:bg-surface hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              <X aria-hidden="true" className="size-4" strokeWidth={1.5} />
            </button>
          </header>

          <div className="overflow-y-auto px-7 py-6 text-sm leading-relaxed">
            <p className="font-serif text-[17px] leading-[1.6] text-primary">
              O Vellum, incluindo código-fonte, design, marca, identidade visual, documentação, arquitetura e temas, é
              propriedade exclusiva de <strong className="font-medium">Leonardo Barreiras (Leo Barreiras)</strong>. Este
              repositório é público apenas para <em>visualização e portefólio</em> e não constitui uma licença de código
              aberto.
            </p>

            <section className="mt-6">
              <h3 className="eyebrow">Permitido sem autorização</h3>
              <ol className="mt-3 space-y-2">
                {PERMITTED.map((item, i) => (
                  <li key={item} className="flex gap-3">
                    <span className="nums w-5 shrink-0 font-mono text-[11px] leading-6 text-muted">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section className="mt-6">
              <h3 className="eyebrow">Proibido sem autorização escrita</h3>
              <ol className="mt-3 space-y-2">
                {PROHIBITED.map((item, i) => (
                  <li key={item} className="flex gap-3">
                    <span className="nums w-5 shrink-0 font-mono text-[11px] leading-6 text-accent-primary">
                      {String.fromCharCode(97 + i)})
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ol>
            </section>

            <p className="mt-6 border-t border-subtle pt-4 text-xs text-muted">
              Em caso de divergência entre versões, prevalece a versão em Português. Pedidos de licenciamento,
              colaboração ou utilização comercial: através do perfil GitHub do Autor.
            </p>
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-subtle bg-surface/60 px-7 py-4">
            <a
              href={`${REPOSITORY_URL}/blob/main/LICENSE`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-accent-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary"
            >
              Ler o texto integral (PT + EN)
              <ArrowUpRight aria-hidden="true" className="size-3.5" strokeWidth={1.5} />
            </a>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="h-8 rounded-lg border border-subtle bg-elevated px-3 text-sm font-medium text-primary shadow-paper transition-colors duration-150 hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            >
              Fechar
            </button>
          </footer>
        </div>
      </dialog>
    </>
  );
}
