"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SortToggle } from "@/design/components";
import { SearchIcon } from "@/design/icons";

/**
 * Busca e ordem dentro de um Universo (tela 11).
 *
 * Os dois vivem na URL: o resultado é compartilhável e o botão voltar
 * funciona — duas coisas que estado só no cliente perderia.
 */
export function ControlesDoUniverso({
  slug,
  nomeDoUniverso,
  termoInicial = "",
  ordem,
}: {
  slug: string;
  nomeDoUniverso: string;
  termoInicial?: string;
  ordem: "atividade" | "recentes";
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [termo, setTermo] = useState(termoInicial);

  useEffect(() => {
    const atual = termo.trim();
    if (atual === termoInicial.trim()) return;

    const espera = setTimeout(() => {
      const novos = new URLSearchParams(params.toString());
      if (atual) novos.set("q", atual);
      else novos.delete("q");
      router.push(`/u/${slug}?${novos}`);
    }, 350);

    return () => clearTimeout(espera);
  }, [termo, termoInicial, params, router, slug]);

  function trocarOrdem(nova: "atividade" | "recentes") {
    const novos = new URLSearchParams(params.toString());
    novos.set("ordem", nova);
    router.push(`/u/${slug}?${novos}`);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="bg-paper border-inkMuted box-border flex flex-1 items-center gap-2 rounded-sm border-2 px-2">
        <SearchIcon decorative className="size-iconSm text-inkMuted shrink-0" />
        <input
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          aria-label={`Buscar em ${nomeDoUniverso}`}
          placeholder={`Buscar em ${nomeDoUniverso}`}
          className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
        />
      </div>
      <SortToggle ordem={ordem} onChange={trocarOrdem} />
    </div>
  );
}
