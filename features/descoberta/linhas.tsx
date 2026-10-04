"use client";

import { useState, useTransition } from "react";
import { CommunityDoor, FollowButton, LevelMark } from "@/design/components";
import { TopicStarInline } from "@/design/icons";
import { alternarComunidade, alternarSeguirPessoa } from "./actions";
import type { ComunidadeNaLista, PessoaNaBusca, TopicoNaBusca } from "@/lib/data/descoberta";

/** Milhares com ponto, como o protótipo mostra: "3.412 membros". */
function numero(valor: number) {
  return valor.toLocaleString("pt-BR");
}

/**
 * Linha de comunidade nas telas de descoberta.
 *
 * O `#` entra e sai da comunidade com um toque, e a contagem de membros muda
 * na hora — é critério de aceite. O número é atualizado otimisticamente para
 * a tela não parecer travada enquanto o servidor responde; se der erro, ele
 * volta.
 */
export function LinhaComunidade({
  comunidade,
  mostrarUniverso = false,
  mostrarRespostasHoje = false,
}: {
  comunidade: ComunidadeNaLista;
  mostrarUniverso?: boolean;
  mostrarRespostasHoje?: boolean;
}) {
  const [membro, setMembro] = useState(comunidade.souMembro);
  const [membros, setMembros] = useState(comunidade.membersCount);
  const [pendente, iniciar] = useTransition();

  function alternar() {
    const eraMembro = membro;
    const tinha = membros;

    setMembro(!eraMembro);
    setMembros(tinha + (eraMembro ? -1 : 1));

    iniciar(async () => {
      try {
        await alternarComunidade(comunidade.id, eraMembro);
      } catch {
        // Falhou: volta ao que era, em vez de mentir sobre o estado.
        setMembro(eraMembro);
        setMembros(tinha);
      }
    });
  }

  return (
    <div className="bg-paper flex items-center gap-3 rounded-sm p-3">
      <span
        aria-hidden="true"
        className="size-thumb bg-lavender shrink-0 rounded-sm bg-cover bg-center"
        style={comunidade.coverUrl ? { backgroundImage: `url(${comunidade.coverUrl})` } : undefined}
      />

      <span className="min-w-0 flex-1">
        <span className="text-bodyStrong text-ink block truncate">{comunidade.name}</span>
        <span className="text-caption text-inkMuted block">
          {mostrarUniverso ? `{${comunidade.universo.name}, ` : ""}
          {numero(membros)} {membros === 1 ? "membro" : "membros"}
          {mostrarUniverso ? "" : null}
          {/* Tela 11: membros e respostas de hoje em linhas separadas. */}
          {mostrarRespostasHoje && comunidade.respostasHoje !== undefined ? (
            <>
              <br />
              {numero(comunidade.respostasHoje)}{" "}
              {comunidade.respostasHoje === 1 ? "resposta hoje" : "respostas hoje"}
            </>
          ) : null}
        </span>
      </span>

      <CommunityDoor
        member={membro}
        oQue={comunidade.name}
        onToggle={pendente ? undefined : alternar}
      />
    </div>
  );
}

/** RN15: tópico mostra pessoas e respostas, nunca um placar. */
export function LinhaTopico({ topico }: { topico: TopicoNaBusca }) {
  return (
    <a href={`/topico/${topico.id}`} className="bg-paper flex items-center gap-3 rounded-sm p-3">
      <LevelMark level="topic" />
      <span className="min-w-0 flex-1">
        <span className="text-bodyStrong text-ink block">
          <TopicStarInline className="mr-1" />
          {topico.name}
        </span>
        <span className="text-caption text-inkMuted block">
          {topico.comunidade.name}. {numero(topico.pessoas)}{" "}
          {topico.pessoas === 1 ? "pessoa" : "pessoas"}, {numero(topico.respostas)}{" "}
          {topico.respostas === 1 ? "resposta" : "respostas"}
        </span>
      </span>
    </a>
  );
}

/** RN17: nome real, @ e foto. RN27: comunidades em comum. */
export function LinhaPessoa({ pessoa }: { pessoa: PessoaNaBusca }) {
  const [seguindo, setSeguindo] = useState(pessoa.seguindo);
  const [pendente, iniciar] = useTransition();

  function alternar() {
    const estava = seguindo;
    setSeguindo(!estava);

    iniciar(async () => {
      try {
        await alternarSeguirPessoa(pessoa.id, estava);
      } catch {
        setSeguindo(estava);
      }
    });
  }

  const emComum = pessoa.comunidadesEmComum;

  return (
    <div className="bg-paper flex items-center gap-3 rounded-sm p-3">
      <span
        aria-hidden="true"
        className="size-avatar rounded-pill bg-lavender shrink-0 bg-cover bg-center"
        style={pessoa.avatarUrl ? { backgroundImage: `url(${pessoa.avatarUrl})` } : undefined}
      />

      <a href={`/${pessoa.handle}`} className="min-w-0 flex-1">
        <span className="text-bodyStrong text-ink block truncate">{pessoa.name}</span>
        <span className="text-caption text-inkMuted block">
          @{pessoa.handle}
          {emComum > 0
            ? `, ${emComum} ${emComum === 1 ? "comunidade em comum" : "comunidades em comum"}`
            : ""}
        </span>
      </a>

      <FollowButton
        seguindo={seguindo}
        oQue={pessoa.name}
        onToggle={pendente ? undefined : alternar}
      />
    </div>
  );
}
