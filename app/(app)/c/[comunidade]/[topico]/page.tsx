import type { Metadata } from "next";

import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentColumn } from "@/design/components";
import { CorpoDoTopico } from "@/features/topicos/corpo";
import { CabecalhoDoTopico } from "@/features/topicos/cabecalho";
import { TelaDeConvite } from "@/features/convite/tela";
import { metadataCompartilhavel } from "@/features/convite/metadata";
import { enderecoDeMidia } from "@/lib/midia/deposito";
import { getViewer } from "@/lib/auth/session";
import type { OrdemDasRespostas } from "@/lib/data/topics";
import { LIMITE_RESPOSTAS_PARA_APAGAR, topicoPorEndereco } from "@/lib/data/topics";
import { NotFoundError } from "@/lib/data/errors";
import { marcarTopicoComoVisto, quandoVisitouOTopico } from "@/lib/data/inicio";
import { sugestoesParaConvidar } from "@/lib/data/cabins";

type Params = Promise<{ comunidade: string; topico: string }>;

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
  const { dados, viewer } = await carregar(params);

  /*
   * O nome do tópico **sem o asterisco** fora do Hub (item 6 do escopo): a
   * marca de nível é linguagem de dentro, e num cartão do WhatsApp ela
   * viraria só um símbolo estranho antes do nome.
   */
  return metadataCompartilhavel({
    titulo: `${dados.name} · ${dados.community.name}`,
    descricao: dados.description,
    capaUrl: await enderecoDeMidia(dados.community.coverUrl),
    semConta: viewer.kind !== "member",
  });
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
export default async function TopicoPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ convite?: string; ordem?: string }>;
}) {
  const { viewer, slugs, dados } = await carregar(params);
  const endereco = `/c/${slugs.comunidade}/${slugs.topico}`;

  // Qualquer valor estranho na URL cai no padrão, em vez de dar erro: o
  // endereço é compartilhável, e endereço compartilhado é endereço editado.
  const { ordem: pedida } = await searchParams;
  const ordem: OrdemDasRespostas = pedida === "antigas" ? "antigas" : "recentes";

  /*
   * Sem conta: a tela 2, o convite (F14).
   *
   * O cookie que faz o onboarding marcar esta comunidade e devolver a
   * pessoa a este tópico (RN31) é gravado pelo **proxy** — gravar cookie
   * durante a renderização não é permitido no App Router.
   */
  if (viewer.kind !== "member") {
    const { convite } = await searchParams;

    return (
      <TelaDeConvite
        comunidade={{
          nome: dados.community.name,
          slug: dados.community.slug,
          intro: dados.community.intro,
          membros: dados.community.membersCount,
          capaUrl: await enderecoDeMidia(dados.community.coverUrl),
        }}
        topico={{
          nome: dados.name,
          abertura: dados.description,
          respostas: dados.answerCount,
          pessoas: dados.peopleCount,
        }}
        compartilhadoPor={convite}
      />
    );
  }

  /*
   * Abrir o tópico zera o "n novas" do Início (F11).
   *
   * Sem `await`: marcar o visto não pode atrasar a tela, e se falhar o pior
   * que acontece é o número continuar lá na próxima visita.
   */
  // Lido **antes** de marcar: depois, a marca já seria "agora" e a linha de
  // contribuições novas nunca apareceria.
  const vistoEm = await quandoVisitouOTopico(viewer, dados.id);
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
        paraCompartilhar={await sugestoesParaConvidar(viewer)}
      />

      <CorpoDoTopico
        topicId={dados.id}
        endereco={endereco}
        abertura={dados.description}
        autor={dados.author?.name}
        pessoas={dados.peopleCount}
        respostas={dados.answerCount}
        podeVerRespostas={dados.podeVerRespostas}
        ordem={ordem}
        vistoEm={vistoEm}
      />
    </ContentColumn>
  );
}
