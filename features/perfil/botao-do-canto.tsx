"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/design/cn";

/**
 * Botão redondo só com ícone, do canto do perfil.
 *
 * Mora em `features/perfil/` e não no design system porque é desta tela: é
 * o `RoundIconButton` com duas coisas que só o perfil precisa — a cor
 * carregando o nível da ação (sun para seguir, lavanda para Cabine) e o
 * ponto de pendência. Subir isso para `design/` seria publicar um
 * componente com duas variações que nenhuma outra tela usa.
 *
 * **Rótulo é obrigatório.** Sem texto ao lado, ele é a única coisa que diz
 * o que o botão faz — e o tipo exige, então nenhum sai mudo.
 */
type Tom = "destaque" | "escuro" | "lavanda" | "claro";

function classeDoTom(tom: Tom): string {
  switch (tom) {
    /** Ação principal da tela. É o que sun significa no Hub. */
    case "destaque":
      return "bg-sun text-ink";
    /** Estado ligado: já sigo. */
    case "escuro":
      return "bg-ink text-paper";
    /** Botão de ícone do design system. */
    case "lavanda":
      return "bg-lavender text-ink";
    /** Secundário, sobre a cor de fundo escolhida. */
    case "claro":
      return "bg-paper text-ink";
  }
}

type Comum = {
  rotulo: string;
  tom: Tom;
  children: ReactNode;
  /** Um ponto em ink no canto: há algo esperando resposta. */
  aviso?: boolean;
};

type Props =
  | (Comum & { como: "link"; href: string })
  | (Comum & {
      como: "botao";
      onClick?: () => void;
      desabilitado?: boolean;
      pressionado?: boolean;
      expandido?: boolean;
      controla?: string;
    });

export function BotaoDoCanto(props: Props) {
  const { rotulo, tom, children, aviso } = props;

  const classe = cn(
    "size-navItem rounded-pill relative grid cursor-pointer place-items-center",
    classeDoTom(tom),
    "como" in props && props.como === "botao" && props.desabilitado
      ? "cursor-not-allowed opacity-60"
      : null,
  );

  const conteudo = (
    <>
      {children}
      {aviso ? (
        /*
          O ponto fica dentro do botão, não ao lado: encostado na borda ele
          seria cortado pelo `rounded-pill`, e ninguém o veria.
        */
        <span
          aria-hidden="true"
          className="bg-ink border-lavender rounded-pill absolute top-0 right-0 size-2 border-2"
        />
      ) : null}
    </>
  );

  if (props.como === "link") {
    return (
      <Link href={props.href} aria-label={rotulo} title={rotulo} className={classe}>
        {conteudo}
      </Link>
    );
  }

  return (
    <button
      type="button"
      aria-label={rotulo}
      title={rotulo}
      aria-pressed={props.pressionado}
      aria-expanded={props.controla ? props.expandido : undefined}
      aria-controls={props.controla}
      disabled={props.desabilitado}
      onClick={props.onClick}
      className={classe}
    >
      {conteudo}
    </button>
  );
}
