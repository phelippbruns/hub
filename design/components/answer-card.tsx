import type { ReactNode } from "react";

/**
 * Cartão de resposta. Mostra o nome real do autor, como manda o princípio de
 * identidade real, e não tem curtida nem contador — participação, não
 * popularidade.
 *
 * O texto é renderizado como texto, nunca como HTML (regra de segurança 8).
 *
 * `media` é a imagem ou o GIF, e entra **dentro** do cartão: a mídia é parte
 * da mensagem, não um anexo solto embaixo dela. Como a resposta pode ser só
 * mídia, o parágrafo só aparece quando há texto — senão sobra um espaço em
 * branco sem conteúdo.
 */
export function AnswerCard({
  author,
  handle,
  when,
  children,
  avatar,
  media,
}: {
  author: string;
  handle: string;
  when: string;
  children?: ReactNode;
  avatar?: ReactNode;
  media?: ReactNode;
}) {
  return (
    <article className="bg-paper flex flex-col gap-1 rounded-sm p-2">
      <div className="flex items-center gap-2">
        {avatar}
        <span className="text-bodyStrong text-ink wrap-anywhere">{author}</span>
        <span className="text-caption text-inkMuted">
          @{handle} · {when}
        </span>
      </div>
      {children ? <p className="text-body text-ink wrap-anywhere">{children}</p> : null}
      {/*
        O embrulho não é enfeite. O cartão é `flex flex-col`, e item de flex
        em coluna **estica na largura** por padrão (`align-items: stretch`):
        sem isto, uma imagem pequena ou um GIF de 200 px eram espichados até
        a largura do cartão. Era o que acontecia quando a mídia passou para
        dentro dele.

        `self-start` devolve a largura própria; `max-w-full` é só a trava
        contra uma foto mais larga que o cartão furar a página.
      */}
      {media ? <div className="max-w-full self-start">{media}</div> : null}
    </article>
  );
}
