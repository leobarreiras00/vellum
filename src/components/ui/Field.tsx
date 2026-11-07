/**
 * Vellum — Primitivas de formulário (<Label />, <Input />, <Textarea />, <Select />)
 * © 2026 Leonardo Barreiras (Leo Barreiras). Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 */
import { ChevronDown } from "lucide-react";
import { forwardRef, type InputHTMLAttributes, type LabelHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const control = [
  "w-full rounded-lg border border-subtle bg-elevated px-3 font-sans text-sm text-primary shadow-[inset_0_1px_0_rgb(var(--border-subtle-rgb)/0.5)]",
  "placeholder:text-muted/70 transition-[border-color,box-shadow] duration-150 ease-editorial",
  "focus-visible:border-accent-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/25 focus-visible:ring-offset-0",
  "disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-accent-primary/70",
].join(" ");

export function Label({ className, ...props }: LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("mb-1.5 block text-xs font-medium text-primary", className)} {...props} />;
}

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(function Input(
  { className, ...props },
  ref,
) {
  return <input ref={ref} className={cn(control, "h-9", className)} {...props} />;
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(function Textarea(
  { className, ...props },
  ref,
) {
  return <textarea ref={ref} className={cn(control, "min-h-24 resize-y py-2 leading-relaxed", className)} {...props} />;
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(function Select(
  { className, ...props },
  ref,
) {
  return (
    <span className="relative block">
      <select ref={ref} className={cn(control, "h-9 cursor-pointer appearance-none pr-8", className)} {...props} />
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute right-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
        strokeWidth={1.5}
      />
    </span>
  );
});

export function FieldError({ id, children }: { id?: string; children?: ReactNode }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="mt-1.5 text-xs text-accent-primary">
      {children}
    </p>
  );
}
