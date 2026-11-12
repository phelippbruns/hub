"use client";

import { useState } from "react";
import {
  BookIcon,
  HeadphonesIcon,
  ScreenIcon,
  SparkIcon,
  WorkIcon,
  CreateIcon,
  type IconProps,
} from "@/design/icons";
import { prefixoDoStatus, type TipoDeStatus } from "@/lib/status";
import { EditorDeStatus } from "./editor-de-status";

/** O ícone de cada tipo. Um por tipo, nunca um genérico — ver `design/icons`. */
export function IconeDoStatus({ tipo, ...props }: { tipo: TipoDeStatus } & IconProps) {
  switch (tipo) {
    case "listening":
      return <HeadphonesIcon {...props} />;
    case "reading":
      return <BookIcon {...props} />;
    case "watching":
      return <ScreenIcon {...props} />;
    case "working":
      return <WorkIcon {...props} />;
    case "custom":
      return <SparkIcon {...props} />;
  }
}

export type StatusDaTela = { tipo: TipoDeStatus; texto: string } | null;

/**
 * RN40: a pílula de status, abaixo do nome e dos seguidores.
 *
 * **Quem não tem status não ocupa lugar nenhum.** Para o visitante, a
 * pílula simplesmente não existe — nem um espaço reservado, nem um traço.
 * Perfil sem status tem de parecer um perfil, não um perfil com um campo
 * vazio.
 *
 * Para o dono, o vazio vira o convite "Definir status", com contorno
 * tracejado: ali a ausência é uma ação disponível, e escondê-la deixaria a
 * função inalcançável.
 *
 * **Tocar abre coisas diferentes conforme quem toca.** O dono vai direto ao
 * editor, porque é o que ele quer fazer. O visitante vai ao histórico, no
 * painel — tocar é curiosidade sobre a pessoa, não sobre o campo.
 */
export function PilulaDeStatus({
  status,
  souEu,
  aoAbrirHistorico,
}: {
  status: StatusDaTela;
  souEu: boolean;
  /** O que fazer quando um visitante toca. Sem isto, a pílula não é botão. */
  aoAbrirHistorico?: () => void;
}) {
  const [editando, setEditando] = useState(false);

  if (!status) {
    if (!souEu) return null;

    return (
      <>
        <button
          type="button"
          onClick={() => setEditando(true)}
          className="text-caption text-inkMuted border-line rounded-pill mt-1 flex w-fit cursor-pointer items-center gap-1 border border-dashed py-1 pr-3 pl-1 font-medium"
        >
          <span className="bg-lavenderSoft text-inkMuted rounded-pill size-mark grid place-items-center">
            <CreateIcon decorative className="size-iconSm" />
          </span>
          Definir status
        </button>
        <EditorDeStatus aberto={editando} atual={null} onFechar={() => setEditando(false)} />
      </>
    );
  }

  const prefixo = prefixoDoStatus(status.tipo);
  const clicavel = souEu || aoAbrirHistorico !== undefined;
  const Elemento = clicavel ? "button" : "span";
  /*
   * O rótulo repete o prefixo porque o leitor de tela lê o botão inteiro de
   * uma vez: "Ouvindo Cascade" é a informação, e "status" sozinho não é.
   */
  const rotulo = prefixo ? `Status: ${prefixo} ${status.texto}` : `Status: ${status.texto}`;

  return (
    <>
      {/*
        Sem destino, a pílula não é botão.
        O histórico mora no painel lateral e chega no Bloco 6; até lá o
        visitante vê o status e não tem onde clicar. Um `<button>` que não
        faz nada é pior do que texto: ele promete uma ação que não existe.
      */}
      <Elemento
        {...(clicavel
          ? {
              type: "button" as const,
              "aria-label": rotulo,
              onClick: () => (souEu ? setEditando(true) : aoAbrirHistorico?.()),
            }
          : { "aria-label": rotulo, role: "note" })}
        className={`text-caption text-ink bg-paper border-line rounded-pill mt-1 flex w-fit max-w-full items-center gap-1 border py-1 pr-3 pl-1 font-medium ${
          clicavel ? "hover:border-ink cursor-pointer" : ""
        }`}
      >
        <span className="bg-ink text-paper rounded-pill size-mark grid shrink-0 place-items-center">
          <IconeDoStatus tipo={status.tipo} decorative className="size-iconSm" />
        </span>
        {/*
          `truncate` e não `wrap-anywhere`: a pílula é de uma linha por
          desenho, e um status de 60 caracteres sem espaço a esticaria por
          cima do resto do cabeçalho. Aqui cortar é o certo — o texto
          inteiro está no `aria-label` e no histórico.
        */}
        <span className="truncate">
          {prefixo ? `${prefixo} ` : null}
          <b className="font-bold">{status.texto}</b>
        </span>
      </Elemento>
      {souEu ? (
        <EditorDeStatus aberto={editando} atual={status} onFechar={() => setEditando(false)} />
      ) : null}
    </>
  );
}
