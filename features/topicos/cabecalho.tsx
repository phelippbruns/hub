"use client";

import { useRouter } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  BottomSheet,
  Button,
  ConfirmSheet,
  FollowButton,
  PageTitle,
  RoundIconButton,
  TopicName,
} from "@/design/components";
import { BackIcon, MoreOptionsIcon, ShareIcon } from "@/design/icons";
import { alternarSeguirTopico, apagarTopico } from "./actions";
import { Compartilhar, type PessoaParaCompartilhar } from "@/features/convite/compartilhar";

/**
 * O cabeçalho do tópico (tela 15): voltar, compartilhar, seguir e o menu.
 *
 * Os estados moram juntos porque são excludentes — abrir um fecha os outros,
 * como no cabeçalho da comunidade.
 */
export function CabecalhoDoTopico({
  topicId,
  nome,
  endereco,
  comunidadeSlug,
  seguindoInicial,
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
  seguindoInicial: boolean;
  souAutor: boolean;
  podeApagar: boolean;
  respostasDeOutros: number;
  limite: number;
  /** Quem pode receber o link (F14). Vem pronto do servidor. */
  paraCompartilhar: PessoaParaCompartilhar[];
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<"nenhum" | "compartilhar" | "menu" | "apagar">("nenhum");
  const [seguindo, setSeguindo] = useState(seguindoInicial);
  const [pendente, iniciar] = useTransition();

  const idDoMenu = useId();
  const idDeCompartilhar = useId();

  function abrir(qual: typeof aberto) {
    setAberto((atual) => (atual === qual ? "nenhum" : qual));
  }

  function alternarOlho() {
    const estava = seguindo;
    setSeguindo(!estava);

    iniciar(async () => {
      try {
        await alternarSeguirTopico(topicId, estava, endereco);
      } catch {
        setSeguindo(estava);
      }
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <RoundIconButton label="Voltar" onClick={() => router.back()}>
          <BackIcon decorative className="size-icon" />
        </RoundIconButton>

        <span className="min-w-0 flex-1">
          <PageTitle>
            <TopicName>{nome}</TopicName>
          </PageTitle>
        </span>

        <RoundIconButton
          label={`Compartilhar ${nome}`}
          ativo={aberto === "compartilhar"}
          controla={idDeCompartilhar}
          onClick={() => abrir("compartilhar")}
        >
          <ShareIcon decorative className="size-icon" />
        </RoundIconButton>

        {/* RN18: o olho segue, e seguir é sempre manual. */}
        <FollowButton
          seguindo={seguindo}
          oQue={`o tópico ${nome}`}
          onToggle={pendente ? undefined : alternarOlho}
        />

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

      <div id={idDeCompartilhar}>
        <BottomSheet title={`Compartilhar ${nome}`} open={aberto === "compartilhar"}>
          {/* Montada só quando a folha abre: a busca é uma ida ao servidor. */}
          {aberto === "compartilhar" ? (
            <Compartilhar
              tipo="topico"
              id={topicId}
              nome={nome}
              endereco={endereco}
              pessoas={paraCompartilhar}
              aoFechar={() => setAberto("nenhum")}
            />
          ) : null}
        </BottomSheet>
      </div>

      <div id={idDoMenu}>
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
                Tópicos com {limite} respostas ou mais de outras pessoas não podem ser apagados,
                para preservar a participação de quem respondeu. Se houver um problema, denuncie
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
          respostasDeOutros === 1 ? "resposta" : "respostas"
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
