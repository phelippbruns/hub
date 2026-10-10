"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { SortToggle } from "@/design/components";
import { SearchIcon } from "@/design/icons";

/**
 * Ordem e busca dos tópicos dentro da comunidade (tela 14).
 *
 * Os dois vivem na URL: o resultado é compartilhável e o botão voltar
 * funciona — como na página do Universo da F06.
 */
export function ControlesDeTopicos({
  slug,
  nomeDaComunidade,
  termoInicial = "",
  ordem,
}: {
  slug: string;
  nomeDaComunidade: string;
  termoInicial?: string;
  ordem: "respostas" | "recentes";
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
      router.push(`/c/${slug}?${novos}`);
    }, 350);

    return () => clearTimeout(espera);
  }, [termo, termoInicial, params, router, slug]);

  function trocarOrdem(nova: "atividade" | "recentes") {
    const novos = new URLSearchParams(params.toString());
    novos.set("ordem", nova === "atividade" ? "respostas" : "recentes");
    router.push(`/c/${slug}?${novos}`);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="bg-paper border-inkMuted box-border flex flex-1 items-center gap-2 rounded-sm border-2 px-2">
        <SearchIcon decorative className="size-iconSm text-inkMuted shrink-0" />
        <input
          type="search"
          value={termo}
          onChange={(evento) => setTermo(evento.target.value)}
          aria-label={`Buscar tópicos em ${nomeDaComunidade}`}
          placeholder="Buscar tópicos"
          className="text-body text-ink min-w-0 flex-1 border-0 bg-transparent py-2 outline-none"
        />
      </div>
      {/*
        O SortToggle fala "atividade" e "recentes" desde a F06; aqui
        "atividade" quer dizer mais respostas. A tradução fica no handler para
        a URL continuar dizendo o que a comunidade entende.
      */}
      <SortToggle ordem={ordem === "respostas" ? "atividade" : "recentes"} onChange={trocarOrdem} />
    </div>
  );
}
