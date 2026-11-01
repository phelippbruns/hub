import { Suspense } from "react";
import { EmptyState, PaginaCarregando, TopicOpening } from "@/design/components";
import { CampoDeResposta } from "@/features/respostas/campo";
import { LinhaDeResposta } from "@/features/respostas/linha";
import { OrdemDasRespostas as ControleDaOrdem } from "@/features/respostas/ordem";
import { getViewer } from "@/lib/auth/session";
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
  endereco,
  abertura,
  autor,
  pessoas,
  respostas,
  podeVerRespostas,
  ordem,
  vistoEm,
}: {
  topicId: string;
  endereco: string;
  abertura: string;
  autor?: string;
  pessoas: number;
  respostas: number;
  podeVerRespostas: boolean;
  ordem: OrdemDasRespostas;
  /**
   * Quando a pessoa viu o tópico pela última vez, lido **antes** de marcar
   * a visita de agora. É o que desenha a linha de contribuições novas.
   */
  vistoEm: Date | null;
}) {
  if (!podeVerRespostas) {
    return (
      <>
        <TopicOpening autor={autor} abertura={abertura} pessoas={pessoas} respostas={respostas} />
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
      <TopicOpening autor={autor} abertura={abertura} pessoas={pessoas} respostas={respostas} />

      <CampoDeResposta
        topicId={topicId}
        endereco={endereco}
        gifLigado={Boolean(serverEnv().GIPHY_API_KEY)}
      />

      <div className="flex justify-end">
        <ControleDaOrdem endereco={endereco} atual={ordem} />
      </div>

      <Suspense
        key={ordem}
        fallback={
          <PaginaCarregando titulo={false} linhas={2} label="Carregando as contribuições" />
        }
      >
        <Contribuicoes topicId={topicId} endereco={endereco} ordem={ordem} vistoEm={vistoEm} />
      </Suspense>
    </>
  );
}

/** A lista de contribuições, pedida depois do cabeçalho. */
async function Contribuicoes({
  topicId,
  endereco,
  ordem,
  vistoEm,
}: {
  topicId: string;
  endereco: string;
  ordem: OrdemDasRespostas;
  vistoEm: Date | null;
}) {
  const viewer = await getViewer();
  const respostas = await respostasDoTopico(viewer, topicId, ordem);

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
              imagem: resposta.mediaHref,
              tipoDaMidia: resposta.mediaKind,
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
