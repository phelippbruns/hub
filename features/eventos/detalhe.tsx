import Link from "next/link";
import { SectionTitle } from "@/design/components";
import { BackIcon } from "@/design/icons";
import { CartaoDoEvento } from "./cartao";
import type { ParaEntrar } from "@/features/comunidades/janela-de-entrada";
import type { EventoNaTela } from "@/lib/data/eventos";

/**
 * **Um evento aberto no centro da comunidade.**
 *
 * É o pedido do PO: clicar em "Ver evento" abria a aba Eventos inteira e
 * fazia a pessoa procurar de novo na lista o encontro que ela acabou de
 * escolher. Agora o evento ocupa o centro, **com a coluna da direita ao
 * lado** — o que só é possível porque o painel do tópico não monta junto
 * (a precedência está em `features/comunidades/shared.ts`).
 *
 * O cartão é o **mesmo** da lista, de propósito: confirmar presença, o link
 * da sala e a contagem de vagas têm um lugar só. O que esta tela acrescenta
 * é o caminho de volta e a **área de comentários**.
 */
export function DetalheDoEvento({
  evento,
  slug,
  souMembro,
  paraEntrar,
  comentarios,
}: {
  evento: EventoNaTela;
  slug: string;
  souMembro: boolean;
  paraEntrar: ParaEntrar;
  /**
   * A conversa por baixo do encontro, montada pela página.
   *
   * Vem de fora porque ela é o corpo do tópico inteiro, e **uma feature não
   * importa de outra**: quem compõe `features/eventos` com
   * `features/topicos` é a página da comunidade, como o menu de criar compõe
   * tópico e comunidade. Juntá-las aqui arrastaria a feature de tópicos para
   * dentro desta.
   *
   * Opcional porque o encontro existe sem ela: evento recém-criado por um
   * seed antigo, ou conversa apagada à mão, continuam mostrando o cartão em
   * vez de derrubar a tela.
   */
  comentarios?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      {/*
        A volta é um link, e não um botão de histórico: quem chegou aqui por
        um endereço colado não tem para onde voltar, e `history.back()` o
        jogaria fora do Hub. O destino é a lista, sempre.
      */}
      <Link
        href={`/c/${slug}?aba=eventos`}
        className="text-label text-inkMuted min-h-controlSm inline-flex items-center gap-1 self-start underline underline-offset-2"
      >
        <BackIcon decorative className="size-iconSm" />
        Todos os eventos
      </Link>

      <SectionTitle>Evento</SectionTitle>

      {/*
        `aberto`: este cartão **é** o encontro aberto, então ele não traz o
        link para os comentários — eles estão logo embaixo.
      */}
      <CartaoDoEvento
        evento={evento}
        slug={slug}
        souMembro={souMembro}
        paraEntrar={paraEntrar}
        aberto
      />

      {/*
        **Os comentários são contribuições de verdade**, e vêm do mesmo corpo
        que o painel do tópico desenha. Não é economia de código: é o que faz
        estrela (RN15), imagem, GIF, `@`, "não se edita" (RN14), o bloqueio de
        links (RN16) e a moderação valerem aqui sem nenhuma regra escrita de
        novo — e sem o risco de uma delas ficar de fora calada.
      */}
      {comentarios}
    </div>
  );
}
