"use client";

import { cn } from "../cn";

export type Tab = {
  id: string;
  label: string;
  /** Um número ao lado do rótulo, como "Enquetes 1". Zero não desenha nada. */
  count?: number;
};

/**
 * Abas. O estado ativo não depende só da cor: a aba atual leva
 * `aria-selected`, e o formato muda junto — traço sob o rótulo no formato
 * `traco`, fundo escuro no formato `pilula`.
 *
 * **Dois formatos, porque são dois trabalhos diferentes.** O `traco` divide
 * um conteúdo em partes (as abas do perfil); a `pilula` é navegação dentro
 * de uma tela que tem muita coisa, e é o que o protótipo v6 da comunidade
 * mostra — alinhada à esquerda, sem esticar, para caber um contador.
 */
export function Tabs({
  tabs,
  activeId,
  onSelect,
  label,
  formato = "traco",
}: {
  tabs: Tab[];
  activeId: string;
  onSelect?: (id: string) => void;
  /** Nome do conjunto de abas, para o leitor de tela. */
  label: string;
  formato?: "traco" | "pilula";
}) {
  const pilula = formato === "pilula";

  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("flex", pilula ? "gap-1" : "border-line border-b")}
    >
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
              "text-label flex cursor-pointer items-center gap-1 font-semibold",
              pilula
                ? cn(
                    "rounded-pill min-h-navItem px-3 py-2",
                    active ? "bg-ink text-paper" : "text-inkMuted",
                  )
                : cn(
                    "flex-1 px-1 py-2",
                    active
                      ? "border-ink text-ink border-b-2"
                      : "text-inkMuted border-b-2 border-transparent",
                  ),
            )}
          >
            {tab.label}
            {/*
              O contador fica em amarelo mesmo na aba ativa, que é escura:
              é a única cor que se lê nos dois fundos sem precisar de uma
              segunda regra.
            */}
            {tab.count ? (
              <span className="bg-sun text-ink rounded-pill text-caption px-1 font-bold">
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
