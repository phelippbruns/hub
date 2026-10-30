"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import type { ReactNode } from "react";

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
  children,
}: {
  slugDaComunidade: string;
  slug: string;
  children: ReactNode;
}) {
  const params = useSearchParams();
  const painelAberto = params.get("t") !== null;

  const novos = new URLSearchParams(params.toString());
  novos.set("t", slug);

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
