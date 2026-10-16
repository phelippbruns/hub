import type { Metadata } from "next";
import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentColumn, EmptyState, PaginaCarregando, TopicOpening } from "@/design/components";
import { CampoDeResposta } from "@/features/respostas/campo";
import { LinhaDeResposta } from "@/features/respostas/linha";
import { CabecalhoDoTopico } from "@/features/topicos/cabecalho";
import { getViewer } from "@/lib/auth/session";
import {
  LIMITE_RESPOSTAS_PARA_APAGAR,
  respostasDoTopico,
  topicoPorEndereco,
} from "@/lib/data/topics";
import { NotFoundError } from "@/lib/data/errors";
import { haQuantoTempo } from "@/lib/tempo";
import { marcarTopicoComoVisto } from "@/lib/data/inicio";
import { serverEnv } from "@/lib/env";

type Params = Promise<{ comunidade: string; topico: string }>;

/** A lista de respostas, pedida depois do cabeçalho. */
async function Respostas({ topicId, endereco }: { topicId: string; endereco: string }) {
  const viewer = await getViewer();
  const respostas = await respostasDoTopico(viewer, topicId);

  if (!respostas || respostas.length === 0) {
    return (
      <EmptyState
        title="Nenhuma resposta ainda"
        description="Seja a primeira pessoa a responder."
      />
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {respostas.map((resposta) => (
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
  );
}

async function carregar(params: Params) {
  const { comunidade, topico } = await params;
  const viewer = await getViewer();
  try {
    return {
      viewer,
      slugs: { comunidade, topico },
      /*
       * Sem as respostas: elas são a parte lenta — uma assinatura no
       * depósito por imagem e por foto de perfil — e escorrem depois, num
       * `<Suspense>`. O cabeçalho aparece na hora.
       *
       * Não dá para usar `loading.tsx` aqui: ele abriria o limite **antes**
       * de a página rodar, e esta rota chama `notFound()`. O cabeçalho sairia
       * como 200 e o 404 do tópico inexistente viraria 200. Aconteceu em 15
       * de outubro; está no Faustão.
       */
      dados: await topicoPorEndereco(viewer, comunidade, topico, { comRespostas: false }),
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
  const { viewer, slugs, dados } = await carregar(params);
  const endereco = `/c/${slugs.comunidade}/${slugs.topico}`;

  /*
   * Abrir o tópico zera o "n novas" do Início (F11).
   *
   * Sem `await`: marcar o visto não pode atrasar a tela, e se falhar o pior
   * que acontece é o número continuar lá na próxima visita.
   */
  void marcarTopicoComoVisto(viewer, dados.id);

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
      {!dados.podeVerRespostas ? (
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

          <Suspense
            fallback={
              <PaginaCarregando titulo={false} linhas={2} label="Carregando as respostas" />
            }
          >
            <Respostas topicId={dados.id} endereco={endereco} />
          </Suspense>
        </>
      )}
    </ContentColumn>
  );
}
