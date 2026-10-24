"use client";

import { Switch } from "./switch";
import { cn } from "../cn";

/**
 * Uma linha de ajuste: nome à esquerda, explicação abaixo, interruptor à
 * direita.
 *
 * Existe porque o padrão estava copiado em dois lugares e, nos dois, **o
 * nome não aparecia na tela** — ele vivia só no `aria-label` do
 * interruptor. Quem enxerga lia "Convites para conversar e mensagens
 * novas." sem saber o que aquela frase liga, e os interruptores soltos em
 * cima de cada parágrafo ocupavam a tela inteira.
 *
 * O nome é o rótulo do interruptor para todo mundo: o `<button>` continua
 * levando `aria-label`, e quem lê a tela vê o mesmo texto. A explicação
 * fica em `aria-describedby`, que é o papel dela — contexto, não nome.
 */
export function SwitchRow({
  nome,
  descricao,
  checked,
  onToggle,
  className,
}: {
  nome: string;
  descricao: string;
  checked: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  const id = `ajuste-${nome.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;

  return (
    <div className={cn("flex items-start justify-between gap-3", className)}>
      <span className="flex min-w-0 flex-col">
        <span className="text-bodyStrong text-ink">{nome}</span>
        <span id={id} className="text-caption text-inkMuted">
          {descricao}
        </span>
      </span>

      <Switch checked={checked} onToggle={onToggle} label={nome} describedBy={id} />
    </div>
  );
}
