"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PinButton } from "@/design/components";
import { alternarComunidadeFixada } from "./actions";
import type { MinhaComunidade } from "@/lib/data/comunidades";

function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/**
 * Uma linha de Minhas Comunidades (tela 12).
 *
 * Fixar é otimista: a comunidade sobe na hora. Se o servidor recusar, volta —
 * é melhor do que uma lista parada esperando resposta.
 */
export function LinhaMinhaComunidade({ comunidade }: { comunidade: MinhaComunidade }) {
  const [fixada, setFixada] = useState(comunidade.fixada);
  const [pendente, iniciar] = useTransition();

  function alternar() {
    const estava = fixada;
    setFixada(!estava);

    iniciar(async () => {
      try {
        await alternarComunidadeFixada(comunidade.id, !estava);
      } catch {
        setFixada(estava);
      }
    });
  }

  return (
    <div className="bg-paper flex items-center gap-3 rounded-sm p-3">
      <Link href={`/c/${comunidade.slug}`} className="flex min-w-0 flex-1 items-center gap-3">
        <span
          aria-hidden="true"
          className="size-thumb bg-lavender shrink-0 rounded-sm bg-cover bg-center"
          style={
            comunidade.coverUrl ? { backgroundImage: `url(${comunidade.coverUrl})` } : undefined
          }
        />
        <span className="min-w-0">
          <span className="text-bodyStrong text-ink block truncate">{comunidade.name}</span>
          <span className="text-caption text-inkMuted block">
            {numero(comunidade.membersCount)} {comunidade.membersCount === 1 ? "membro" : "membros"}
            , {comunidade.topicosAtivos}{" "}
            {comunidade.topicosAtivos === 1 ? "tópico ativo" : "tópicos ativos"}
          </span>
        </span>
      </Link>

      <PinButton
        fixada={fixada}
        oQue={comunidade.name}
        onToggle={pendente ? undefined : alternar}
      />
    </div>
  );
}
