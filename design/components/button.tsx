import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../cn";

type Variant = "primary" | "secondary" | "highlight" | "danger" | "icon" | "claro";
type Size = "md" | "sm";

/**
 * O design system é plano, sem sombra: o contorno do secundário é borda, não
 * box-shadow. Com `box-border` a borda não muda o tamanho externo do botão.
 */
export const variants: Record<Variant, string> = {
  /** Ação principal. */
  primary: "bg-ink text-paper border-2 border-ink",
  /** Ação secundária. */
  secondary: "bg-transparent text-ink border-2 border-ink",
  /** Destaque do ciclo: o Responder do cartão de Hot Topic. Texto sempre em ink. */
  highlight: "bg-sun text-ink border-2 border-sun",
  /**
   * Ação destrutiva: sair da comunidade, excluir conta. Contorno e não
   * preenchimento — a cor de erro nunca é fundo de botão no sistema, e o
   * texto diz o que vai acontecer, então a cor não carrega o sentido sozinha.
   */
  danger: "bg-transparent text-error border-2 border-error",
  /** Botão só de ícone, em lavender. */
  icon: "bg-lavender text-ink border-2 border-lavender size-control p-0",
  /**
   * Sobre fundo escuro — hoje, só a capa da comunidade.
   *
   * O `secondary` é contorno em ink, que sobre a capa fica invisível. O
   * `RoundIconButton` já resolvia isso com `bg-paper`; esta variante é a
   * mesma ideia para um botão com texto.
   */
  claro: "bg-paper text-ink border-2 border-paper",
};

/**
 * As duas alturas de botão.
 *
 * O `sm` era `py-1`, que dava 28 px de altura — abaixo do alvo de toque de
 * qualquer diretriz. Com `py-2` ele chega a 36, a mesma altura dos chips,
 * e a escala continua distinguindo os dois tamanhos pelo texto.
 *
 * Os 44 px que o briefing pede valem para os controles principais, que já
 * os têm: os botões redondos da capa, a marca # e as abas. Levar **todo**
 * controle a 44 muda a densidade de telas que hoje são só de computador —
 * e esse é trabalho da F21, quando o toque entrar de verdade.
 */
export const sizes: Record<Size, string> = {
  md: "px-3 py-2 text-bodyStrong",
  sm: "px-3 py-2 text-caption",
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
