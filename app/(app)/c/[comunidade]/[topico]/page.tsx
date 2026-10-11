import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentColumn, EmptyState, TopicOpening } from "@/design/components";
import { CampoDeResposta } from "@/features/respostas/campo";
import { LinhaDeResposta } from "@/features/respostas/linha";
import { CabecalhoDoTopico } from "@/features/topicos/cabecalho";
import { getViewer } from "@/lib/auth/session";
import { LIMITE_RESPOSTAS_PARA_APAGAR, topicoPorEndereco } from "@/lib/data/topics";
import { NotFoundError } from "@/lib/data/errors";
import { haQuantoTempo } from "@/lib/tempo";
import { serverEnv } from "@/lib/env";

type Params = Promise<{ comunidade: string; topico: string }>;

async function carregar(params: Params) {
  const { comunidade, topico } = await params;
  const viewer = await getViewer();
  try {
    return {
      slugs: { comunidade, topico },
      dados: await topicoPorEndereco(viewer, comunidade, topico),
    };
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { dados } = await carregar(params);
  return { title: `${dados.name} · ${dados.community.name} · Hub`, description: dados.description };
}

/**
 * Tela 15: a página do tópico.
 *
 * As respostas aparecem **só para ler**: a caixa de responder, o menu de cada
 * resposta e a ordenação são a F09. Mostrá-las agora é o que permite julgar a
 * tela com conteúdo de verdade, em vez de uma casca.
 *
 * Na web o tópico ocupa a largura toda, sem painel lateral — item 7 do
 * escopo da feature.
 */
export default async function TopicoPage({ params }: { params: Params }) {
  const { slugs, dados } = await carregar(params);
  const endereco = `/c/${slugs.comunidade}/${slugs.topico}`;

  return (
    <ContentColumn larga>
      <Link href={`/c/${dados.community.slug}`} className="text-caption text-inkMuted">
        {dados.community.name}
      </Link>

      <CabecalhoDoTopico
        topicId={dados.id}
        nome={dados.name}
        endereco={endereco}
        comunidadeSlug={dados.community.slug}
        seguindoInicial={dados.following}
        souAutor={dados.souAutor}
        podeApagar={dados.podeApagar}
        respostasDeOutros={dados.respostasDeOutros}
        limite={LIMITE_RESPOSTAS_PARA_APAGAR}
      />

      <TopicOpening
        autor={dados.author?.name}
        abertura={dados.description}
        pessoas={dados.peopleCount}
        respostas={dados.answerCount}
      />

      {/* RN16: sem conta, a lista de respostas não vem do servidor. */}
      {dados.answers === null ? (
        <EmptyState
          title="Entre para ver as respostas"
          description="As respostas aparecem para quem tem conta no Hub."
        />
      ) : (
        <>
          <CampoDeResposta
            topicId={dados.id}
            endereco={endereco}
            gifLigado={Boolean(serverEnv().GIPHY_API_KEY)}
          />

          {dados.answers.length === 0 ? (
            <EmptyState
              title="Nenhuma resposta ainda"
              description="Seja a primeira pessoa a responder."
            />
          ) : (
            <div className="flex flex-col gap-2">
              {dados.answers.map((resposta) => (
                <LinhaDeResposta
                  key={resposta.id}
                  endereco={endereco}
                  resposta={{
                    id: resposta.id,
                    texto: resposta.text,
                    quando: haQuantoTempo(resposta.createdAt),
                    souAutor: resposta.souAutor,
                    imagem: resposta.mediaHref,
                    tipoDaMidia: resposta.mediaKind,
                    autor: resposta.author
                      ? {
                          nome: resposta.author.name,
                          handle: resposta.author.handle,
                          avatarUrl: resposta.author.avatarUrl,
                        }
                      : null,
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}
    </ContentColumn>
  );
}
