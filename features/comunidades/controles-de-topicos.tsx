"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CampoDeBusca, Chip } from "@/design/components";
import type { FiltroDeTopicos } from "./shared";

/**
 * Os filtros e a busca da lista de tópicos (tela 14).
 *
 * **Chips com nome, no lugar dos dois ícones sem rótulo.** Eram um traço e
 * um relógio, e ninguém sabia o que faziam sem clicar nos dois. "Seguindo"
 * é o que absorveu a seção "Tópicos que você segue aqui", que ocupava o
 * topo da tela mesmo quando a pessoa seguia um tópico só.
 *
 * Tudo vive na URL: o resultado é compartilhável e o botão voltar funciona.
 *
 * A busca aparece **sempre**, e procura no nome do tópico e no texto das
 * contribuições. O porquê de cada uma das duas coisas está no comentário
 * ao lado do campo, lá embaixo.
 */
export function ControlesDeTopicos({
  slug,
  nomeDaComunidade,
  termoInicial = "",
  filtro,
  comNovidades,
  souMembro,
}: {
  slug: string;
  nomeDaComunidade: string;
  termoInicial?: string;
  filtro: FiltroDeTopicos;
  /** Quantos tópicos têm contribuição nova. Zero esconde o chip. */
  comNovidades: number;
  souMembro: boolean;
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

  function escolher(novo: FiltroDeTopicos) {
    const novos = new URLSearchParams(params.toString());
    if (novo === "alta") novos.delete("filtro");
    else novos.set("filtro", novo);
    // `ordem` é o parâmetro antigo, dos dois ícones. Some com o clique.
    novos.delete("ordem");
    const consulta = novos.toString();
    router.push(consulta ? `/c/${slug}?${consulta}` : `/c/${slug}`);
  }

  const opcoes: { id: FiltroDeTopicos; rotulo: string }[] = [
    { id: "alta", rotulo: "Em alta" },
    { id: "recentes", rotulo: "Recentes" },
    // Seguir é coisa de quem participa: para visitante o chip levaria a
    // uma lista sempre vazia.
    ...(souMembro ? [{ id: "seguindo" as const, rotulo: "Seguindo" }] : []),
    ...(souMembro && comNovidades > 0
      ? [{ id: "novas" as const, rotulo: `Com novidades (${comNovidades})` }]
      : []),
  ];

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex flex-wrap gap-1" role="group" aria-label="Filtrar tópicos">
        {opcoes.map((opcao) => (
          <Chip
            formato="pilula"
            key={opcao.id}
            label={opcao.rotulo}
            selected={filtro === opcao.id}
            onClick={() => escolher(opcao.id)}
          />
        ))}
      </div>

      {/*
        **A busca aparece sempre**, desde 7 de novembro de 2026.

        Ela só existia a partir de 10 tópicos, e a ideia era não poluir
        comunidade nova. O efeito foi outro: o PO abriu uma comunidade
        com um tópico, não achou onde buscar, e mandou o print. Um campo
        de busca é o lugar onde se procura — escondê-lo até a lista doer
        faz procurar o campo em vez do conteúdo.

        E ela não procura só no nome do tópico: acha também pelo texto
        das contribuições.
      */}
      <CampoDeBusca
        rotulo={`Buscar tópicos em ${nomeDaComunidade}`}
        atalho
        placeholder="Buscar tópicos e contribuições"
        className="min-w-0 flex-1"
        value={termo}
        onChange={(evento) => setTermo(evento.target.value)}
      />
    </div>
  );
}
