import type { ButtonHTMLAttributes } from "react";
import { cn } from "../cn";

type ChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  selected?: boolean;
  /**
   * Cor do chip selecionado. `lavender` é o padrão; `sun` serve aos chips de
   * Universo, porque a cor de cada nível é fixa em toda a rede.
   */
  tone?: "lavender" | "sun";
  /**
   * `traco` é o chip de interesse do onboarding; `pilula` é o filtro de
   * lista do protótipo v6, que inverte para fundo escuro quando escolhido.
   */
  formato?: "traco" | "pilula";
  label: string;
};

/**
 * Chip de filtro ou de interesse.
 *
 * Lavender contra surfacePage tem só 2,1:1, então o estado selecionado não pode
 * depender só da cor: o ✓ é o segundo sinal, como manda o design system.
 *
 * No formato `pilula` o ✓ não entra, e não é descuido: ali o selecionado
 * **inverte** — fundo ink, texto paper. A diferença não é de matiz, é de
 * claro para escuro, que se lê sem distinguir cor nenhuma. O `aria-pressed`
 * continua dizendo o estado para quem usa leitor de tela.
 */
export function Chip({
  selected = false,
  tone = "lavender",
  formato = "traco",
  label,
  className,
  ...props
}: ChipProps) {
  const pilula = formato === "pilula";
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(
        "text-label box-border inline-flex cursor-pointer items-center gap-1 font-semibold",
        pilula
          ? cn(
              "rounded-pill min-h-controlSm px-3 py-1",
              selected ? "bg-ink text-paper" : "border-line text-ink bg-paper border",
            )
          : cn(
              "text-ink rounded-sm px-2 py-1",
              selected
                ? tone === "sun"
                  ? "border-sun bg-sun border-2"
                  : "border-lavender bg-lavender border-2"
                : "border-inkMuted bg-paper border-2",
            ),
        className,
      )}
      {...props}
    >
      {selected && !pilula ? <span aria-hidden="true">✓</span> : null}
      {label}
    </button>
  );
}
