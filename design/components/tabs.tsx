"use client";

import { cn } from "../cn";

export type Tab = { id: string; label: string };

/**
 * Abas. O estado ativo não depende só da cor: a aba atual leva `aria-selected`
 * e um traço em ink sob o rótulo.
 */
export function Tabs({
  tabs,
  activeId,
  onSelect,
  label,
}: {
  tabs: Tab[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** Nome do conjunto de abas, para o leitor de tela. */
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="border-line flex border-b">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onSelect?.(tab.id)}
            className={cn(
              "text-label flex-1 cursor-pointer px-1 py-2 font-semibold",
              active
                ? "border-ink text-ink border-b-2"
                : "text-inkMuted border-b-2 border-transparent",
            )}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
