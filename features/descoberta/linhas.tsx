"use client";

import { useState, useTransition } from "react";
import { CommunityDoor, FollowButton, LevelMark, TopicName } from "@/design/components";
import { alternarComunidade, alternarSeguirPessoa } from "./actions";
import type { ComunidadeNaLista, PessoaNaBusca, TopicoNaBusca } from "@/lib/data/descoberta";
import Link from "next/link";
import { enderecoDaComunidade, enderecoDoTopico } from "@/lib/rotas";

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
 *
 * **A capa e o nome abrem a comunidade.** Até 12 de novembro de 2026 esta
 * linha era uma `<div>` em que **só o `#` era clicável**: clicar no nome não
 * fazia nada, e o PO relatou isso duas vezes, em telas diferentes. As irmãs
 * `LinhaTopico` e `LinhaPessoa`, logo abaixo, já eram link desde sempre — só
 * esta ficou de fora.
 *
 * Um arquivo, quatro seções: "Novas no Hub" no Início, "Em alta" e "Para
 * você" no Explorar, e os resultados de comunidade na Busca.
 *
 * **O `#` fica fora do link**, e não é detalhe de gosto: botão dentro de
 * âncora é HTML inválido, e o navegador desfaz do jeito dele — entrar na
 * comunidade passaria a navegar junto. É o mesmo arranjo de
 * `features/comunidades/linha-minha.tsx`.
 */
export function LinhaComunidade({
  comunidade,
  mostrarRespostasHoje = false,
}: {
  comunidade: ComunidadeNaLista;
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
    <div className="bg-paper hover:ring-lavender flex items-center gap-3 rounded-sm p-3 hover:ring-2 hover:ring-inset">
      <Link
        href={enderecoDaComunidade(comunidade.slug)}
        className="flex min-w-0 flex-1 items-center gap-3"
      >
        <span
          aria-hidden="true"
          className="size-thumb bg-lavender shrink-0 rounded-sm bg-cover bg-center"
          style={
            comunidade.coverUrl ? { backgroundImage: `url(${comunidade.coverUrl})` } : undefined
          }
        />

        <span className="min-w-0 flex-1">
          <span className="text-bodyStrong text-ink block truncate">{comunidade.name}</span>
          <span className="text-caption text-inkMuted block">
            {numero(membros)} {membros === 1 ? "membro" : "membros"}
            {/* Tela 11: membros e respostas de hoje em linhas separadas. */}
            {mostrarRespostasHoje && comunidade.respostasHoje !== undefined ? (
              <>
                <br />
                {numero(comunidade.respostasHoje)}{" "}
                {comunidade.respostasHoje === 1 ? "contribuição hoje" : "contribuições hoje"}
              </>
            ) : null}
          </span>
        </span>
      </Link>

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
    <a
      href={enderecoDoTopico(topico.comunidade.slug, topico.slug)}
      className="bg-paper flex items-center gap-3 rounded-sm p-3"
    >
      <LevelMark level="topic" />
      <span className="min-w-0 flex-1">
        <span className="text-bodyStrong text-ink block">
          <TopicName>{topico.name}</TopicName>
        </span>
        <span className="text-caption text-inkMuted block">
          {topico.comunidade.name}. {numero(topico.pessoas)}{" "}
          {topico.pessoas === 1 ? "pessoa" : "pessoas"}, {numero(topico.respostas)}{" "}
          {topico.respostas === 1 ? "contribuição" : "contribuições"}
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
