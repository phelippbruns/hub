"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useId, useState, useTransition } from "react";
import {
  AnswerCard,
  Avatar,
  Button,
  ConfirmSheet,
  MenuSuspenso,
  MidiaDaContribuicao,
  RoundIconButton,
  StarButton,
} from "@/design/components";
import { MoreOptionsIcon } from "@/design/icons";
import { alternarEstrelaDaContribuicao, apagarResposta } from "./actions";
import { TextoMarcado, type MarcacoesDoTexto } from "@/features/notificacoes/texto-marcado";

export type RespostaNaTela = {
  id: string;
  texto: string;
  /** O que o texto marcou e existe de verdade: só isso vira link. */
  marcacoes: MarcacoesDoTexto;
  /** A comunidade desta resposta, para o endereço dos tópicos marcados. */
  comunidade: string;
  quando: string;
  souAutor: boolean;
  /** Chegou desde a minha última visita ao tópico: ganha o anel amarelo. */
  nova: boolean;
  /** RN15: quantas estrelas a contribuição tem. */
  estrelas: number;
  /** RN15: se **eu** dei estrela nela. */
  estrelada: boolean;
  imagem: string | null;
  /** Imagem enviada ou GIF: muda o alternativo e o comportamento. */
  tipoDaMidia: "image" | "gif" | null;
  /** Só GIF: o quadro parado, para ele não tocar sozinho na lista. */
  midiaParada: string | null;
  /** Medidas gravadas no envio, para a lista não pular. */
  medidasDaMidia: { largura: number | null; altura: number | null } | null;
  autor: { nome: string; handle: string; avatarUrl: string | null } | null;
};

/**
 * Uma resposta (tela 15).
 *
 * RN14: não existe editar. O menu da própria resposta tem **só** apagar, com
 * a dica de que corrigir é apagar e responder de novo — é a regra virando
 * texto na tela, em vez de uma ausência que a pessoa não entende.
 *
 * RN17: foto, nome e @ levam ao perfil.
 */
export function LinhaDeResposta({
  resposta,
  endereco,
}: {
  resposta: RespostaNaTela;
  endereco: string;
}) {
  const [aberto, setAberto] = useState<"nenhum" | "menu" | "apagar">("nenhum");
  const [pendente, iniciar] = useTransition();
  const [estrelada, setEstrelada] = useState(resposta.estrelada);
  const [estrelas, setEstrelas] = useState(resposta.estrelas);
  const [estrelando, estrelar] = useTransition();
  const idDoMenu = useId();
  const caminho = usePathname();
  const parametros = useSearchParams();

  /*
   * Para onde a denúncia devolve a pessoa — **com a busca junto**.
   *
   * O tópico vive em `/c/<comunidade>?t=<topico>` desde que a tela cheia
   * saiu. `usePathname()` devolve só `/c/<comunidade>`, então voltar da
   * denúncia abria a lista e fechava o tópico — exatamente o que o
   * "voltar" existe para impedir.
   */
  const daqui = parametros.size > 0 ? `${caminho}?${parametros.toString()}` : caminho;

  const autor = resposta.autor;
  const nome = autor?.nome ?? "Pessoa que saiu do Hub";
  const handle = autor?.handle ?? "removida";

  const avatar = <Avatar nome={nome} url={autor?.avatarUrl} tamanho="lg" />;

  /*
   * A estrela muda na hora, antes da resposta do servidor (item 2.3).
   *
   * O servidor devolve o número de verdade, lido depois do gatilho, e a
   * tela se corrige com ele: o palpite erra quando outra pessoa estrelou
   * a mesma contribuição no meio do caminho. Se a requisição falhar,
   * volta ao que era.
   */
  function alternarEstrela() {
    if (estrelando) return;
    const estava = estrelada;
    setEstrelada(!estava);
    setEstrelas((n) => n + (estava ? -1 : 1));

    estrelar(async () => {
      try {
        const certo = await alternarEstrelaDaContribuicao(resposta.id);
        setEstrelada(certo.estrelada);
        setEstrelas(certo.total);
      } catch {
        setEstrelada(estava);
        setEstrelas((n) => n + (estava ? 1 : -1));
      }
    });
  }

  /*
   * O que **não** alterna a estrela: imagem, GIF, menu, nome, avatar e
   * qualquer link ou botão do cartão (item 3.4). Cada um deles já faz
   * alguma coisa, e fazer duas no mesmo gesto é o tipo de surpresa que
   * ninguém associa ao próprio clique.
   */
  function emAreaLivre(evento: React.MouseEvent) {
    const alvo = evento.target as HTMLElement | null;
    return alvo?.closest("a,button,[role=button],img") === null;
  }

  /*
   * O menu abre **em balão, ancorado no botão** — `MenuSuspenso`, não
   * `BottomSheet`.
   *
   * A folha é desenhada no fluxo da página: abrir empurra tudo que está
   * embaixo, e dentro do cartão ela espremia o texto a uma letra por
   * linha. O próprio componente registra que a Cabine saiu dela pelo
   * mesmo motivo; o painel do tópico já usava o balão, e o cartão ficou
   * para trás.
   *
   * O `relative` é obrigatório e mora aqui: quem põe o menu em posição é
   * o pai, porque é ele que sabe onde o botão está.
   */
  const menu = (
    <span className="relative">
      <RoundIconButton
        label={
          resposta.souAutor ? "Opções da sua contribuição" : `Opções da contribuição de ${nome}`
        }
        ativo={aberto === "menu"}
        controla={idDoMenu}
        onClick={() => setAberto((a) => (a === "menu" ? "nenhum" : "menu"))}
      >
        <MoreOptionsIcon decorative className="size-icon" />
      </RoundIconButton>

      <span id={idDoMenu}>
        <MenuSuspenso
          titulo={resposta.souAutor ? "Sua contribuição" : nome}
          aberto={aberto === "menu"}
          onFechar={() => setAberto("nenhum")}
        >
          {resposta.souAutor ? (
            <>
              <Button variant="danger" onClick={() => setAberto("apagar")}>
                Apagar contribuição
              </Button>
              {/* RN14: a ausência de "editar" precisa ser explicada. */}
              <p className="text-caption text-inkMuted">
                Para corrigir, apague e contribua de novo.
              </p>
            </>
          ) : (
            <>
              {/* Ligados na F16. O `voltar` traz a pessoa de volta ao
                  tópico: denunciar não é motivo para perder o lugar. */}
              <Link href={`/denuncia?resposta=${resposta.id}&voltar=${encodeURIComponent(daqui)}`}>
                <Button variant="secondary" className="w-full">
                  Denunciar
                </Button>
              </Link>
              <Link href={`/denuncia?bloquear=${handle}&voltar=${encodeURIComponent(daqui)}`}>
                <Button variant="secondary" className="w-full">
                  Bloquear {nome}
                </Button>
              </Link>
            </>
          )}
        </MenuSuspenso>
      </span>
    </span>
  );

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <AnswerCard
          author={nome}
          handle={handle}
          when={resposta.quando}
          minha={resposta.souAutor}
          nova={resposta.nova}
          acoes={menu}
          rodape={
            <StarButton
              estrelada={estrelada}
              total={estrelas}
              onToggle={estrelando ? undefined : alternarEstrela}
            />
          }
          /*
            Clique duplo na área livre alterna a estrela (item 3.2). Clique
            simples não faz nada (3.3): a leitura é o uso normal do cartão,
            e um clique solto premiando alguém seria um acidente diário.
          */
          onDoubleClick={(evento) => {
            if (!emAreaLivre(evento)) return;
            alternarEstrela();
          }}
          /*
            Cancelar o segundo `mousedown` é o que impede o navegador de
            selecionar a palavra sob o cursor no duplo clique (item 3.5).

            Desligar `user-select` seria o reflexo, e mataria junto a
            seleção por arraste — que **tem** que continuar funcionando,
            porque copiar um trecho é o que se faz com texto de gente.
            Cancelar só o `detail === 2` deixa o arraste intacto: ele
            começa no primeiro `mousedown`.
          */
          onMouseDown={(evento) => {
            if (evento.detail === 2 && emAreaLivre(evento)) evento.preventDefault();
          }}
          avatar={autor ? <Link href={`/${handle}`}>{avatar}</Link> : avatar}
          media={
            resposta.imagem ? (
              <MidiaDaContribuicao
                url={resposta.imagem}
                parado={resposta.midiaParada}
                tipo={resposta.tipoDaMidia ?? "image"}
                medidas={resposta.medidasDaMidia ?? undefined}
                autor={nome}
              />
            ) : null
          }
        >
          <TextoMarcado
            texto={resposta.texto}
            existentes={resposta.marcacoes}
            comunidade={resposta.comunidade}
          />
        </AnswerCard>
      </div>

      <ConfirmSheet
        open={aberto === "apagar"}
        titulo="Apagar esta contribuição?"
        descricao="Ela some para todo mundo. Não dá para desfazer."
        confirmar="Apagar contribuição"
        pendente={pendente}
        onConfirm={() => iniciar(() => apagarResposta(resposta.id, endereco))}
        onCancel={() => setAberto("nenhum")}
      />
    </div>
  );
}
