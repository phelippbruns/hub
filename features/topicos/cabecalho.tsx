"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  BottomSheet,
  Button,
  CommunityChip,
  ConfirmSheet,
  RoundIconButton,
} from "@/design/components";
import { BackIcon, MoreOptionsIcon, ShareIcon } from "@/design/icons";
import { apagarTopico } from "./actions";
import { Compartilhar, type PessoaParaCompartilhar } from "@/features/convite/compartilhar";

/**
 * A barra de cima da tela do tópico (tela 15, protótipo v6): voltar, o chip
 * da comunidade, compartilhar e o menu.
 *
 * **O nome do tópico e o olho de seguir saíram daqui** e foram para dentro
 * do cartão escuro (`TopicOpening`): no protótipo v6 a pergunta e a ação de
 * guardá-la são o mesmo bloco. Sobrou a barra de ferramentas, que é o que
 * ela sempre foi.
 *
 * Os estados moram juntos porque são excludentes — abrir um fecha os outros,
 * como no cabeçalho da comunidade.
 */
export function CabecalhoDoTopico({
  topicId,
  nome,
  endereco,
  comunidadeSlug,
  nomeDaComunidade,
  souAutor,
  podeApagar,
  respostasDeOutros,
  limite,
  paraCompartilhar,
}: {
  topicId: string;
  nome: string;
  endereco: string;
  comunidadeSlug: string;
  nomeDaComunidade: string;
  souAutor: boolean;
  podeApagar: boolean;
  respostasDeOutros: number;
  limite: number;
  /** Quem pode receber o link (F14). Vem pronto do servidor. */
  paraCompartilhar: PessoaParaCompartilhar[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<"nenhum" | "compartilhar" | "menu" | "apagar">("nenhum");
  const [pendente, iniciar] = useTransition();

  const idDoMenu = useId();
  const idDeCompartilhar = useId();

  function abrir(qual: typeof aberto) {
    setAberto((atual) => (atual === qual ? "nenhum" : qual));
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <RoundIconButton label="Voltar" onClick={() => router.back()}>
          <BackIcon decorative className="size-icon" />
        </RoundIconButton>

        <span className="min-w-0 flex-1">
          <CommunityChip nome={nomeDaComunidade} href={`/c/${comunidadeSlug}`} />
        </span>

        <RoundIconButton
          label={`Compartilhar ${nome}`}
          ativo={aberto === "compartilhar"}
          controla={idDeCompartilhar}
          onClick={() => abrir("compartilhar")}
        >
          <ShareIcon decorative className="size-icon" />
        </RoundIconButton>

        {souAutor ? (
          <RoundIconButton
            label="Mais opções"
            ativo={aberto === "menu"}
            controla={idDoMenu}
            onClick={() => abrir("menu")}
          >
            <MoreOptionsIcon decorative className="size-icon" />
          </RoundIconButton>
        ) : null}
      </div>

      {/*
        `contents` tira estes dois embrulhos do fluxo: eles existem só para
        carregar o `id` que o `aria-controls` do botão aponta, e como itens
        de uma coluna com `gap` eles cobravam dois espaços de 16 px entre a
        barra e o cartão do tópico, mesmo vazios. Era o vão que aparecia
        acima da pergunta.
      */}
      <div id={idDeCompartilhar} className="contents">
        <BottomSheet title={`Compartilhar ${nome}`} open={aberto === "compartilhar"}>
          {/* Montada só quando a folha abre: a busca é uma ida ao servidor. */}
          {aberto === "compartilhar" ? (
            <Compartilhar
              tipo="topico"
              id={topicId}
              endereco={endereco}
              pessoas={paraCompartilhar}
              aoFechar={() => setAberto("nenhum")}
            />
          ) : null}
        </BottomSheet>
      </div>

      <div id={idDoMenu} className="contents">
        <BottomSheet title={nome} open={aberto === "menu"}>
          {podeApagar ? (
            <Button variant="danger" onClick={() => setAberto("apagar")}>
              Apagar tópico
            </Button>
          ) : (
            <>
              {/*
                Desativado com a razão à vista, e não escondido: sumir com a
                opção faria o autor procurar onde ela foi parar.
              */}
              <Button variant="secondary" disabled>
                Apagar tópico · Indisponível
              </Button>
              <p className="text-caption text-inkMuted">
                Tópicos com {limite} contribuições ou mais de outras pessoas não podem ser apagados,
                para preservar a participação de quem contribuiu. Se houver um problema, denuncie
                para a moderação.
              </p>
            </>
          )}
        </BottomSheet>
      </div>

      <ConfirmSheet
        open={aberto === "apagar"}
        titulo="Apagar este tópico?"
        descricao={`Ele tem ${respostasDeOutros} ${
          respostasDeOutros === 1 ? "contribuição" : "contribuições"
        } de outras pessoas, que também ${
          respostasDeOutros === 1 ? "será apagada" : "serão apagadas"
        }. Não dá para desfazer.`}
        confirmar="Apagar tópico"
        pendente={pendente}
        onConfirm={() => iniciar(() => apagarTopico(topicId, comunidadeSlug))}
        onCancel={() => setAberto("nenhum")}
      />
    </div>
  );
}
