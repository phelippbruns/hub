"use client";

import { ChronologicalIcon, MoreAnswersIcon } from "../icons";
import { cn } from "../cn";

/**
 * Ordem da lista: por atividade ou por mais recentes (tela 11).
 *
 * Dois ícones sem texto, então cada um leva rótulo. O estado vai em
 * `aria-pressed`, não só na cor.
 */
export function SortToggle({
  ordem,
  onChange,
}: {
  ordem: "atividade" | "recentes";
  onChange: (ordem: "atividade" | "recentes") => void;
}) {
  const opcoes = [
    { id: "atividade", label: "Ordenar por atividade", Icone: MoreAnswersIcon },
    { id: "recentes", label: "Ordenar por mais recentes", Icone: ChronologicalIcon },
  ] as const;

  return (
    <div role="group" aria-label="Ordem da lista" className="rounded-pill bg-paper flex gap-1 p-1">
      {opcoes.map(({ id, label, Icone }) => (
        <button
          key={id}
          type="button"
          aria-pressed={ordem === id}
          aria-label={label}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-pill size-iconLg grid cursor-pointer place-items-center",
            ordem === id ? "bg-ink text-paper" : "text-inkMuted",
          )}
        >
          <Icone decorative className="size-iconSm" />
        </button>
      ))}
    </div>
  );
}
