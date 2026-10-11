"use client";

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import {
  AnswerCard,
  BottomSheet,
  Button,
  ConfirmSheet,
  RoundIconButton,
} from "@/design/components";
import { MoreOptionsIcon } from "@/design/icons";
import { apagarResposta } from "./actions";

export type RespostaNaTela = {
  id: string;
  texto: string;
  quando: string;
  souAutor: boolean;
  imagem: string | null;
  /** Imagem enviada ou GIF: muda só o texto alternativo. */
  tipoDaMidia: "image" | "gif" | null;
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
  const idDoMenu = useId();

  const autor = resposta.autor;
  const nome = autor?.nome ?? "Pessoa que saiu do Hub";
  const handle = autor?.handle ?? "removida";

  /*
   * `block` não é enfeite: dentro do link o `span` seria inline, e largura e
   * altura não valem para elemento inline — o avatar some sem erro nenhum.
   */
  const avatar = (
    <span
      aria-hidden="true"
      className="size-avatarMd rounded-pill bg-lavender block shrink-0 bg-cover bg-center"
      style={autor?.avatarUrl ? { backgroundImage: `url(${autor.avatarUrl})` } : undefined}
    />
  );

  return (
    <div className="flex items-start gap-2">
      <div className="min-w-0 flex-1">
        <AnswerCard
          author={nome}
          handle={handle}
          when={resposta.quando}
          avatar={autor ? <Link href={`/${handle}`}>{avatar}</Link> : avatar}
          media={
            resposta.imagem ? (
              /*
               * `<img>` e não `next/image`, e é a primeira vez no projeto que
               * desligo uma regra de lint.
               *
               * O otimizador do Next guarda a imagem pela URL. Aqui a URL é
               * assinada e **expira em dez minutos**: cada visita gera uma nova,
               * então o cache nunca acerta, e sobra o otimizador baixando de novo
               * a cada vez — custo sem ganho. Pior: uma URL que vencesse dentro
               * do cache serviria um erro no lugar da imagem.
               *
               * Se um dia as imagens virarem públicas, isto volta a ser
               * `next/image` e o comentário sai junto.
               */
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={resposta.imagem}
                alt={
                  resposta.tipoDaMidia === "gif"
                    ? `GIF enviado por ${nome}`
                    : `Imagem enviada por ${nome}`
                }
                /*
                 * Preso nos dois lados: imagem que não carrega não tem tamanho
                 * próprio, e sem isto o espaço dela estica a página inteira.
                 */
                className="max-h-cover w-auto max-w-full rounded-sm"
              />
            ) : null
          }
        >
          {resposta.texto}
        </AnswerCard>
      </div>

      <RoundIconButton
        label={resposta.souAutor ? "Opções da sua resposta" : `Opções da resposta de ${nome}`}
        ativo={aberto === "menu"}
        controla={idDoMenu}
        onClick={() => setAberto((a) => (a === "menu" ? "nenhum" : "menu"))}
      >
        <MoreOptionsIcon decorative className="size-icon" />
      </RoundIconButton>

      <div id={idDoMenu}>
        <BottomSheet title={resposta.souAutor ? "Sua resposta" : nome} open={aberto === "menu"}>
          {resposta.souAutor ? (
            <>
              <Button variant="danger" onClick={() => setAberto("apagar")}>
                Apagar resposta
              </Button>
              {/* RN14: a ausência de "editar" precisa ser explicada. */}
              <p className="text-caption text-inkMuted">
                Para corrigir, apague e responda de novo.
              </p>
            </>
          ) : (
            <div className="flex flex-col gap-1">
              {/* Ligados na F16. */}
              <Link href={`/denuncia?resposta=${resposta.id}`}>
                <Button variant="secondary" className="w-full">
                  Denunciar
                </Button>
              </Link>
              <Link href={`/denuncia?bloquear=${handle}`}>
                <Button variant="secondary" className="w-full">
                  Bloquear {nome}
                </Button>
              </Link>
            </div>
          )}
        </BottomSheet>
      </div>

      <ConfirmSheet
        open={aberto === "apagar"}
        titulo="Apagar esta resposta?"
        descricao="Ela some para todo mundo. Não dá para desfazer."
        confirmar="Apagar resposta"
        pendente={pendente}
        onConfirm={() => iniciar(() => apagarResposta(resposta.id, endereco))}
        onCancel={() => setAberto("nenhum")}
      />
    </div>
  );
}
