import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  /**
   * Cor do chip selecionado. `lavender` é o padrão; `sun` serve aos chips de
   * Universo, porque a cor de cada nível é fixa em toda a rede.
   */
  tone?: "lavender" | "sun";
  label: string;
};

/**
 * Chip de filtro ou de interesse.
 *
 * Lavender contra surfacePage tem só 2,1:1, então o estado selecionado não pode
 * depender só da cor: o ✓ é o segundo sinal, como manda o design system.
 */
export function Chip({
  selected = false,
  tone = "lavender",
  label,
  className,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "text-label text-ink box-border inline-flex cursor-pointer items-center gap-1 rounded-sm px-2 py-1 font-semibold",
        selected
          ? tone === "sun"
            ? "border-sun bg-sun border-2"
            : "border-lavender bg-lavender border-2"
          : "border-inkMuted bg-paper border-2",
        className,
      )}
      {...props}
    >
      {selected ? <span aria-hidden="true">✓</span> : null}
      {label}
    </button>
  );
}
