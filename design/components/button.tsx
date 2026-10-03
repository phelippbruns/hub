import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

type Variant = "primary" | "secondary" | "highlight" | "icon";
type Size = "md" | "sm";

/**
 * O design system é plano, sem sombra: o contorno do secundário é borda, não
 * box-shadow. Com `box-border` a borda não muda o tamanho externo do botão.
 */
const variants: Record<Variant, string> = {
  /** Ação principal. */
  primary: "bg-ink text-paper border-2 border-ink",
  /** Ação secundária. */
  secondary: "bg-transparent text-ink border-2 border-ink",
  /** Destaque do ciclo: o Responder do cartão de Hot Topic. Texto sempre em ink. */
  highlight: "bg-sun text-ink border-2 border-sun",
  /** Botão só de ícone, em lavender. */
  icon: "bg-lavender text-ink border-2 border-lavender size-control p-0",
};

const sizes: Record<Size, string> = {
  md: "px-3 py-2 text-bodyStrong",
  sm: "px-2 py-1 text-caption",
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  /**
   * O que falta para habilitar. O design system exige: botão desativado sempre
   * vem com texto que explica o que falta.
   */
  disabledHint?: string;
  children?: ReactNode;
};

export function Button({
  variant = "primary",
  size = "md",
  disabled,
  disabledHint,
  className,
  children,
  ...props
}: ButtonProps) {
  const button = (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "rounded-pill box-border inline-flex cursor-pointer items-center justify-center gap-1 font-semibold",
        variant === "icon" ? "" : sizes[size],
        disabled
          ? "border-line bg-line text-inkMuted cursor-not-allowed border-2"
          : variants[variant],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );

  if (!disabled || !disabledHint) return button;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      {button}
      <span className="text-caption text-inkMuted">{disabledHint}</span>
    </span>
  );
}
