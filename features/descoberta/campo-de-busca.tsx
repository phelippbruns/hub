"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CampoDeBusca as PilulaDeBusca, Segmented } from "@/design/components";

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
      <PilulaDeBusca
        rotulo="Buscar comunidades, tópicos ou pessoas"
        placeholder="Buscar comunidades ou pessoas"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
      />

      <Segmented
        label="Filtrar resultados"
        opcoes={[...FILTROS]}
        atual={filtro}
        onSelect={trocarFiltro}
      />
    </div>
  );
}
