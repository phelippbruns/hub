import { Suspense } from "react";
import {
  EmptyState,
  EndOfList,
  MidiaDaContribuicao,
  PaginaCarregando,
  TopicOpening,
} from "@/design/components";
import { CampoDeResposta } from "@/features/respostas/campo";
import { LinhaDeResposta } from "@/features/respostas/linha";
import { OrdemDasRespostas as ControleDaOrdem } from "@/features/respostas/ordem";
import { CarregarMais } from "@/features/respostas/carregar-mais";
import { getViewer } from "@/lib/auth/session";
import { quemEstaEscrevendo } from "@/lib/data/profiles";
import { respostasDoTopico, type OrdemDasRespostas } from "@/lib/data/topics";
import { haQuantoTempo } from "@/lib/tempo";
import { serverEnv } from "@/lib/env";

/**
 * O miolo do tópico: abertura, compositor, ordem e as contribuições.
 *
 * Mora aqui, e não na página, porque **a página inteira e o painel lateral
 * mostram a mesma coisa**. Duas cópias divergiriam na primeira correção
 * feita só de um lado — e a pessoa veria uma coisa ao clicar e outra ao
 * recarregar o mesmo endereço.
 */
export async function CorpoDoTopico({
  topicId,
  nome,
  endereco,
  abertura,
  autor,
  seguir,
  midia,
  pessoas,
  respostas,
  podeVerRespostas,
  ordem,
  ate,
  vistoEm,
}: {
  topicId: string;
  /** O nome do tópico: desde o protótipo v6 ele mora dentro do cartão. */
  nome: string;
  endereco: string;
  abertura: string;
  autor?: { nome: string; avatarUrl?: string | null };
  /** O olho de seguir, montado pela página porque precisa de estado. */
  seguir?: React.ReactNode;
  /** A imagem ou o GIF da abertura, com endereço já assinado. */
  midia?: {
    url: string;
    parado?: string | null;
    tipo?: "image" | "gif" | null;
    medidas?: { largura: number; altura: number } | null;
  } | null;
  pessoas: number;
  respostas: number;
  podeVerRespostas: boolean;
  ordem: OrdemDasRespostas;
  /** Quantas contribuições mostrar: vem do `?ate=` da URL. */
  ate: number;
  /**
   * Quando a pessoa viu o tópico pela última vez, lido **antes** de marcar
   * a visita de agora. É o que desenha a linha de contribuições novas.
   */
  vistoEm: Date | null;
}) {
  /*
   * Montada **uma vez**, e usada nos dois ramos: o de quem tem conta e o
   * de quem não tem (RN16). Eram dois `TopicOpening` neste arquivo, e eu
   * passei a mídia só para o primeiro — o da tela sem conta. Está no
   * `faustao.md`.
   */
  const midiaDesenhada = midia ? (
    <MidiaDaContribuicao
      url={midia.url}
      parado={midia.parado}
      tipo={midia.tipo ?? "image"}
      medidas={midia.medidas ?? undefined}
      autor={typeof autor === "string" ? autor : (autor?.nome ?? "quem abriu")}
    />
  ) : null;

  if (!podeVerRespostas) {
    return (
      <>
        <TopicOpening
          nome={nome}
          autor={autor}
          abertura={abertura}
          pessoas={pessoas}
          respostas={respostas}
          seguir={seguir}
          midia={midiaDesenhada}
        />
        {/* RN16: sem conta, a lista de respostas não vem do servidor. */}
        <EmptyState
          title="Entre para ver as contribuições"
          description="As contribuições aparecem para quem tem conta no Hub."
        />
      </>
    );
  }

  return (
    <>
      <TopicOpening
        nome={nome}
        autor={autor}
        abertura={abertura}
        pessoas={pessoas}
        respostas={respostas}
        seguir={seguir}
        midia={midiaDesenhada}
      />

      <CampoDeResposta
        topicId={topicId}
        endereco={endereco}
        gifLigado={Boolean(serverEnv().GIPHY_API_KEY)}
        eu={await quemEstaEscrevendo(await getViewer())}
      />

      {/*
        Item 10.3: **os filtros somem com a lista vazia.** Ordenar nada é
        um controle que só confunde — e num tópico recém-aberto ele é a
        primeira coisa que a pessoa vê depois da pergunta.

        O número vem do cabeçalho, que o servidor já tinha: esperar a
        lista chegar para decidir faria a pílula piscar.
      */}
      {respostas > 0 ? (
        <div className="flex justify-end">
          <ControleDaOrdem endereco={endereco} atual={ordem} />
        </div>
      ) : null}

      <Suspense
        key={`${ordem}-${ate}`}
        fallback={
          <PaginaCarregando titulo={false} linhas={2} label="Carregando as contribuições" />
        }
      >
        <Contribuicoes
          topicId={topicId}
          endereco={endereco}
          ordem={ordem}
          ate={ate}
          vistoEm={vistoEm}
        />
      </Suspense>
    </>
  );
}

/** A lista de contribuições, pedida depois do cabeçalho. */
async function Contribuicoes({
  topicId,
  endereco,
  ordem,
  ate,
  vistoEm,
}: {
  topicId: string;
  endereco: string;
  ordem: OrdemDasRespostas;
  /** Quantas mostrar: cresce de 20 em 20 pelo `?ate=` da URL. */
  ate: number;
  vistoEm: Date | null;
}) {
  const viewer = await getViewer();
  const pagina = await respostasDoTopico(viewer, topicId, ordem, ate);
  const respostas = pagina?.respostas ?? null;

  if (!respostas || respostas.length === 0) {
    return (
      <EmptyState
        title="Nenhuma contribuição ainda"
        description="Seja a primeira pessoa a contribuir."
      />
    );
  }

  /*
   * Onde começa o que é novo.
   *
   * A linha é desenhada **uma vez**, antes da primeira contribuição que
   * chegou depois da última visita — e a própria não conta, porque ninguém
   * volta para ver o que acabou de escrever.
   *
   * Em "mais novas" o novo está no começo da lista; em "mais antigas", no
   * fim. O cálculo é o mesmo nos dois: o índice da primeira que atende.
   */
  const novo = vistoEm ? respostas.findIndex((r) => r.createdAt > vistoEm && !r.souAutor) : -1;

  return (
    <div className="flex flex-col gap-2">
      {respostas.map((resposta, i) => (
        <div key={resposta.id} className="flex flex-col gap-2">
          {i === novo ? <SeparadorDeNovas /> : null}
          <LinhaDeResposta
            endereco={endereco}
            resposta={{
              id: resposta.id,
              texto: resposta.text,
              marcacoes: resposta.marcacoes,
              comunidade: resposta.comunidadeDoTopico,
              quando: haQuantoTempo(resposta.createdAt),
              souAutor: resposta.souAutor,
              // RN15: o total, e se **eu** dei. Nunca quem deu.
              estrelas: resposta.starCount,
              estrelada: resposta.estrelada,
              imagem: resposta.mediaHref,
              tipoDaMidia: resposta.mediaKind,
              // Item 9.4: o quadro parado é do GIPHY, público — não
              // precisa de assinatura como a imagem enviada.
              midiaParada: resposta.mediaStillUrl,
              /*
                Item 9.2: as medidas do envio. Nulas nas contribuições
                anteriores a 7 de novembro de 2026 — elas continuam
                aparecendo, só sem o espaço reservado.
              */
              medidasDaMidia:
                resposta.mediaWidth !== null && resposta.mediaHeight !== null
                  ? { largura: resposta.mediaWidth, altura: resposta.mediaHeight }
                  : null,
              /*
                Nova desde a última visita, para o anel amarelo. Mesmo
                critério do separador — e a própria não conta, porque
                ninguém volta para ver o que acabou de escrever.
              */
              nova: vistoEm ? resposta.createdAt > vistoEm && !resposta.souAutor : false,
              autor: resposta.author
                ? {
                    nome: resposta.author.name,
                    handle: resposta.author.handle,
                    avatarUrl: resposta.author.avatarUrl,
                  }
                : null,
            }}
          />
        </div>
      ))}

      {/*
        Item 10.4: a lista **termina**. É o que mantém o Princípio 3 do
        escopo de pé — "não há feed infinito" — mesmo com as
        contribuições chegando de 20 em 20.
      */}
      {pagina?.temMais ? (
        <CarregarMais quantas={respostas.length} />
      ) : (
        <EndOfList>Você chegou ao fim das contribuições</EndOfList>
      )}
    </div>
  );
}

/**
 * A marca de onde começa o que a pessoa ainda não leu.
 *
 * Texto e não só uma linha colorida: quem chega de leitor de tela precisa
 * saber que atravessou a fronteira, e cor sozinha não conta isso.
 */
function SeparadorDeNovas() {
  return (
    <p className="text-caption text-inkMuted flex items-center gap-2">
      <span aria-hidden="true" className="bg-sun h-px flex-1" />
      NOVAS DESDE A SUA ÚLTIMA VISITA
      <span aria-hidden="true" className="bg-sun h-px flex-1" />
    </p>
  );
}
