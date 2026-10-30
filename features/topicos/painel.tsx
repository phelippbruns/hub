"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useId, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";
import {
  Button,
  ConfirmSheet,
  FollowButton,
  MenuSuspenso,
  RoundIconButton,
  TopicName,
} from "@/design/components";
import { CloseIcon, MoreOptionsIcon, ShareIcon } from "@/design/icons";
import { alternarSeguirTopico, apagarTopico } from "./actions";
import { Compartilhar, type PessoaParaCompartilhar } from "@/features/convite/compartilhar";

/**
 * O tópico aberto ao lado da lista da comunidade (protótipo v6).
 *
 * **Coluna no fluxo, grudada no topo**, desenhada pela própria página da
 * comunidade quando há `?t=<endereço>` na URL.
 *
 * Antes isto era uma rota interceptada num encaixe paralelo, para o
 * endereço virar `/c/<comunidade>/<topico>`. Funcionava — e atropelava as
 * rotas irmãs: a interceptação casa **qualquer** segmento abaixo de
 * `/c/<comunidade>/`, então clicar em "Criar tópico" mantinha a comunidade
 * na tela com o endereço de `/novo`. Não dá para excluir rotas no nível do
 * sistema de arquivos, e o PO escolheu o endereço com parâmetro.
 *
 * O conteúdo vem de fora, por `children`: quem o monta é o servidor, e é o
 * **mesmo** componente que a página inteira usa. Duas cópias divergiriam na
 * primeira correção feita só de um lado.
 */
export function PainelDoTopico({
  nome,
  topicId,
  endereco,
  comunidadeSlug,
  nomeDaComunidade,
  seguindoInicial,
  podeApagar,
  respostasDeOutros,
  limite,
  paraCompartilhar,
  children,
}: {
  nome: string;
  topicId: string;
  endereco: string;
  comunidadeSlug: string;
  nomeDaComunidade: string;
  seguindoInicial: boolean;
  souAutor: boolean;
  podeApagar: boolean;
  respostasDeOutros: number;
  limite: number;
  paraCompartilhar: PessoaParaCompartilhar[];
  children: ReactNode;
}) {
  const router = useRouter();
  const [aberto, setAberto] = useState<"nenhum" | "compartilhar" | "menu" | "apagar">("nenhum");
  const [seguindo, setSeguindo] = useState(seguindoInicial);
  const [pendente, iniciar] = useTransition();
  const painel = useRef<HTMLElement>(null);

  const idDoMenu = useId();
  const idDeCompartilhar = useId();

  function abrir(qual: typeof aberto) {
    setAberto((atual) => (atual === qual ? "nenhum" : qual));
  }

  /** Fechar tira o `?t=` e deixa a comunidade como estava. */
  function fechar() {
    router.push(`/c/${comunidadeSlug}`);
  }

  // Esc fecha o painel, como fecha as folhas e os menus. Só quando não há
  // nada aberto por cima: senão um Esc fecharia os dois de uma vez.
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (aberto !== "nenhum") return;
      fechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
    // `fechar` é estável o bastante: ela só usa `router` e o slug.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, comunidadeSlug]);

  // O foco entra no painel ao abrir: sem isso quem usa teclado continuaria
  // navegando a lista atrás dele, sem sinal de que algo apareceu.
  useEffect(() => {
    painel.current?.focus();
  }, [topicId]);

  /*
   * Enquanto o painel existe, a coluna de resumo da comunidade sai da tela.
   *
   * A marca vai no `<body>` porque quem sabe do painel é ele mesmo, e quem
   * desenha o resumo é a página — que é Server Component. Com os dois na
   * tela, o conteúdo ficava espremido em três faixas estreitas; o
   * protótipo esconde a coluna pelo mesmo motivo.
   */
  useEffect(() => {
    document.body.dataset.painel = "aberto";
    return () => {
      delete document.body.dataset.painel;
    };
  }, []);

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
    <aside
      ref={painel}
      tabIndex={-1}
      aria-label={`Tópico ${nome}`}
      className="bg-paper border-line w-topicPanel sticky top-0 flex max-h-screen shrink-0 flex-col gap-3 overflow-y-auto border-l p-3"
    >
      <div className="flex items-center gap-2">
        <span className="text-caption text-inkMuted min-w-0 flex-1 truncate">
          {nomeDaComunidade}
        </span>

        <span className="relative">
          <RoundIconButton
            label={`Compartilhar ${nome}`}
            ativo={aberto === "compartilhar"}
            controla={idDeCompartilhar}
            onClick={() => abrir("compartilhar")}
          >
            <ShareIcon decorative className="size-icon" />
          </RoundIconButton>

          <span id={idDeCompartilhar}>
            <MenuSuspenso
              titulo={`Compartilhar ${nome}`}
              aberto={aberto === "compartilhar"}
              onFechar={() => setAberto("nenhum")}
            >
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
            </MenuSuspenso>
          </span>
        </span>

        {/* RN18: o olho segue, e seguir é sempre manual. */}
        <FollowButton
          seguindo={seguindo}
          oQue={`o tópico ${nome}`}
          onToggle={pendente ? undefined : alternarOlho}
        />

        <span className="relative">
          <RoundIconButton
            label="Mais opções"
            ativo={aberto === "menu"}
            controla={idDoMenu}
            onClick={() => abrir("menu")}
          >
            <MoreOptionsIcon decorative className="size-icon" />
          </RoundIconButton>

          <span id={idDoMenu}>
            <MenuSuspenso
              titulo={nome}
              aberto={aberto === "menu"}
              onFechar={() => setAberto("nenhum")}
            >
              {podeApagar ? (
                <Button variant="danger" onClick={() => setAberto("apagar")}>
                  Apagar tópico
                </Button>
              ) : (
                <>
                  {/*
                    Desativado com a razão à vista, e não escondido: sumir
                    com a opção faria procurar onde ela foi parar.
                  */}
                  <Button variant="secondary" disabled disabledHint="Indisponível neste tópico">
                    Apagar tópico · Indisponível
                  </Button>
                  <p className="text-caption text-inkMuted">
                    Tópicos com {limite} contribuições ou mais de outras pessoas não podem ser
                    apagados, para preservar a participação de quem contribuiu. Se houver um
                    problema, denuncie para a moderação.
                  </p>
                </>
              )}
            </MenuSuspenso>
          </span>
        </span>

        <RoundIconButton label="Fechar tópico" onClick={fechar}>
          <CloseIcon decorative className="size-icon" />
        </RoundIconButton>
      </div>

      <h2 className="text-question text-ink">
        <TopicName>{nome}</TopicName>
      </h2>

      {/*
        A saída para a página inteira: é lá que mora o endereço canônico do
        tópico, o que se manda para alguém que só quer este assunto.
      */}
      <Link href={endereco} className="text-caption text-inkMuted underline underline-offset-2">
        Abrir o tópico inteiro
      </Link>

      {children}

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
    </aside>
  );
}
