"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CampoDeBusca, SortToggle } from "@/design/components";

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
      <CampoDeBusca
        rotulo={`Buscar tópicos em ${nomeDaComunidade}`}
        placeholder="Buscar tópicos"
        className="flex-1"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
      />
      {/*
        O SortToggle fala "atividade" e "recentes" desde a F06; aqui
        "atividade" quer dizer mais respostas. A tradução fica no handler para
        a URL continuar dizendo o que a comunidade entende.
      */}
      <SortToggle ordem={ordem === "respostas" ? "atividade" : "recentes"} onChange={trocarOrdem} />
    </div>
  );
}
