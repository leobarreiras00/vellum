/**
 * Vellum — Primitiva <Button />
 * © 2026 Leonardo Barreiras. Todos os direitos reservados.
 * Licença proprietária — ver LICENSE na raiz do repositório.
 *
 * API ao estilo shadcn/ui (cva + cn), com os tokens Creme e sem dependências
 * extra. Alturas de 28–36px (interface compacta), foco com anel de acento.
 */
import { cva, type VariantProps } from "class-variance-authority";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  [
    "inline-flex shrink-0 select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-sans font-medium",
    "transition-[background-color,border-color,color,box-shadow,transform] duration-150 ease-editorial",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
    "active:scale-[0.97] active:duration-0 disabled:pointer-events-none disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
  ],
  {
    variants: {
      variant: {
        primary: "bg-accent-primary text-canvas shadow-paper hover:bg-accent-primary/90",
        secondary: "border border-subtle bg-elevated text-primary shadow-paper hover:bg-surface",
        ghost: "text-muted hover:bg-surface hover:text-primary",
        quiet: "text-primary hover:bg-accent-primary/[0.06]",
        danger: "border border-danger/40 bg-elevated text-danger hover:bg-danger/[0.08]",
        success: "border border-success/40 bg-elevated text-success hover:bg-success/[0.08]",
      },
      size: {
        sm: "h-7 px-2.5 text-xs [&_svg]:size-3.5",
        md: "h-8 px-3 text-sm",
        lg: "h-9 px-4 text-sm",
        icon: "size-8 [&_svg]:size-4",
        "icon-sm": "size-7 [&_svg]:size-3.5",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, type = "button", ...props },
  ref,
) {
  return <button ref={ref} type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
});
