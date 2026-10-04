"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Segmented } from "@/design/components";
import { SearchIcon } from "@/design/icons";

export const FILTROS = [
  { id: "tudo", label: "Tudo" },
  { id: "comunidades", label: "Comunidades" },
  { id: "topicos", label: "Tópicos" },
  { id: "pessoas", label: "Pessoas" },
] as const;

export type Filtro = (typeof FILTROS)[number]["id"];

/**
 * Campo de busca e filtros, iguais em Explorar e nos resultados.
 *
 * Explorar e busca são **a mesma tela em dois estados**, como no protótipo:
 * muda o que aparece abaixo. Digitar leva para `/busca?q=`; apagar traz de
 * volta para Explorar.
 */
export function CampoDeBusca({
  termoInicial = "",
  filtro = "tudo",
}: {
  termoInicial?: string;
  filtro?: Filtro;
}) {
  const router = useRouter();
  const [termo, setTermo] = useState(termoInicial);

  // A espera evita uma navegação por tecla digitada.
  useEffect(() => {
    const atual = termo.trim();
    if (atual === termoInicial.trim()) return;

    const espera = setTimeout(() => {
      router.push(atual ? `/busca?q=${encodeURIComponent(atual)}&f=${filtro}` : "/comunidades");
    }, 350);

    return () => clearTimeout(espera);
  }, [termo, termoInicial, filtro, router]);

  function trocarFiltro(novo: string) {
    const atual = termo.trim();
    router.push(
      atual ? `/busca?q=${encodeURIComponent(atual)}&f=${novo}` : `/comunidades?f=${novo}`,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="bg-paper border-inkMuted box-border flex items-center gap-2 rounded-sm border-2 px-2">
        <SearchIcon decorative className="size-iconSm text-inkMuted shrink-0" />
        <input
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          aria-label="Buscar comunidades, tópicos ou pessoas"
          placeholder="Buscar comunidades ou pessoas"
          className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
        />
      </div>

      <Segmented
        label="Filtrar resultados"
        opcoes={[...FILTROS]}
        atual={filtro}
        onSelect={trocarFiltro}
      />
    </div>
  );
}
