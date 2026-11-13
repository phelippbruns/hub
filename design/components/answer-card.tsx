import type { ReactNode } from "react";
import { cn } from "../cn";
import { HandleLink } from "./handle-link";

/**
 * Cartão de contribuição. Mostra o nome real do autor, como manda o
 * princípio de identidade real, e não tem curtida nem contador —
 * participação, não popularidade.
 *
 * Dois estados mudam o fundo, e os dois vêm do protótipo v6:
 *
 * - **`minha`**: a própria contribuição ganha fundo lavanda claro. Numa
 *   conversa de dez linhas, achar a sua pelo nome obriga a ler dez nomes.
 *   A dos outros fica em `surfaceNeutral`, o cinza claro. Era `paper`, e
 *   sobre a tela branca do tópico o cartão não tinha borda nenhuma: a
 *   lista parecia um texto corrido, sem separação entre quem falou o quê.
 * - **`nova`**: contribuição que chegou desde a última visita ganha um anel
 *   amarelo. O separador "NOVAS DESDE A SUA ÚLTIMA VISITA" já existe e diz
 *   onde começam; o anel diz **quais são**, o que continua verdade depois
 *   de rolar a tela e perder o separador de vista.
 *
 * Nenhum dos dois é só cor: `minha` repete o nome da pessoa no cabeçalho, e
 * `nova` acompanha o separador, que é texto.
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
  acoes,
  rodape,
  minha = false,
  nova = false,
  onDoubleClick,
  onMouseDown,
}: {
  author: string;
  handle: string;
  when: string;
  children?: ReactNode;
  avatar?: ReactNode;
  media?: ReactNode;
  /** O menu de três pontos, no canto superior direito (protótipo v6). */
  acoes?: ReactNode;
  /** A estrela, no rodapé à direita. */
  rodape?: ReactNode;
  /** A minha própria contribuição. */
  minha?: boolean;
  /** Chegou desde a minha última visita ao tópico. */
  nova?: boolean;
  /**
   * O clique duplo em área livre do cartão (item 3.2 do protótipo). Quem
   * decide o que é "área livre" é quem passa o handler — o cartão não
   * sabe o que há dentro dele.
   */
  onDoubleClick?: (evento: React.MouseEvent) => void;
  /** Par do de cima: é aqui que se impede a seleção da palavra. */
  onMouseDown?: (evento: React.MouseEvent) => void;
}) {
  return (
    <article
      onDoubleClick={onDoubleClick}
      onMouseDown={onMouseDown}
      /*
        `manipulation` tira o atraso de 300 ms e o zoom do toque duplo no
        celular (item 3.6). O resto daquele item é da F21, que é a fase do
        celular; isto entra agora porque é uma classe.
      */
      className={cn(
        onDoubleClick && "touch-manipulation",
        "flex flex-col gap-1 rounded-sm p-2",
        /*
          Os dois fundos só se distinguem sobre `paper`, que é a cor da
          tela do tópico: contra `paper` dão 1,07:1 e 1,11:1, separação
          sutil de propósito. Sobre o `surfacePage` do resto do app eles
          sumiriam (1,0:1) — é por isso que a tela do tópico é branca, na
          página inteira e no painel.
        */
        minha ? "bg-surfacePage" : "bg-surfaceNeutral",
        nova && "ring-sun ring-2",
      )}
    >
      <div className="flex items-center gap-2">
        {avatar}
        <span className="text-bodyStrong text-ink wrap-anywhere">{author}</span>
        <span className="text-caption text-inkMuted">
          {/* O avatar ao lado já leva ao perfil desde a F12; o @ não levava. */}
          <HandleLink handle={handle} className="text-inkMuted font-normal" /> · {when}
        </span>
        {acoes ? <span className="-mt-1 ml-auto shrink-0 self-start">{acoes}</span> : null}
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
      {rodape ? <div className="flex justify-end">{rodape}</div> : null}
    </article>
  );
}
