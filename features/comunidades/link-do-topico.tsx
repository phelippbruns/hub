"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { enderecoDeConversa } from "@/lib/rotas";

/**
 * O link de um tópico na lista da comunidade.
 *
 * Ele abre o tópico **no painel ao lado**, por `?t=<endereço>`, em vez de
 * trocar de página. O endereço continua compartilhável: quem o recebe abre
 * a comunidade com o tópico aberto. E `/c/<comunidade>/<topico>` continua
 * existindo inteiro, para quem quer só o tópico.
 *
 * **Com o painel já aberto, substitui a entrada no histórico.** Sem isso,
 * pular de tópico em tópico — que é o que a lista visível ao lado convida
 * a fazer — deixaria o histórico com um degrau por tópico, e voltar seria
 * uma escada em vez de um passo.
 */
export function LinkDoTopico({
  slugDaComunidade,
  slug,
  eventoId,
  children,
}: {
  slugDaComunidade: string;
  slug: string;
  /**
   * **Preenchido só quando a conversa é a de um encontro** (RN38).
   *
   * Aí o destino não é o painel ao lado: é o encontro no centro, com a
   * coluna da direita. O endereço é montado por `enderecoDeConversa`, num
   * lugar só — e o `?t=` sai da URL, porque `?evento=` ganha dele
   * (`features/comunidades/shared.ts`) e deixá-lo lá seria estado de antes
   * filtrando a tela de agora.
   */
  eventoId?: string | null;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const painelAberto = params.get("t") !== null;

  const novos = new URLSearchParams(params.toString());
  novos.set("t", slug);

  /*
   * O endereço do encontro é absoluto, e não "os parâmetros de agora com o
   * meu trocado": ele muda a aba e o `?evento=`, e carregar `?t=`, `?ordem=`
   * ou `?ate=` da lista para dentro de outra conversa misturaria as duas.
   * Também não substitui no histórico — sair da lista para um encontro é um
   * passo de verdade, e voltar tem de desfazê-lo.
   */
  if (eventoId) {
    return (
      <Link
        href={enderecoDeConversa(slugDaComunidade, { slug, eventoId })}
        scroll={false}
        className="block"
      >
        {children}
      </Link>
    );
  }

  return (
    <Link
      href={`/c/${slugDaComunidade}?${novos}`}
      replace={painelAberto}
      scroll={false}
      className="block"
    >
      {children}
    </Link>
  );
}
