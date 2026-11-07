import type { Metadata } from "next";

import { notFound, redirect } from "next/navigation";
import { TelaDeConvite } from "@/features/convite/tela";
import { metadataCompartilhavel } from "@/features/convite/metadata";
import { enderecoDeMidia } from "@/lib/midia/deposito";
import { getViewer } from "@/lib/auth/session";
import { topicoPorEndereco } from "@/lib/data/topics";
import { NotFoundError } from "@/lib/data/errors";
import { enderecoDoTopico } from "@/lib/rotas";

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
 * Tela 15: o endereço canônico do tópico — **e só isso**.
 *
 * Desde 6 de novembro de 2026 a tela cheia do tópico não existe mais, por
 * decisão do PO: em todo o Hub o tópico abre no painel, ao lado da lista
 * da comunidade. Esta rota **não some** — endereço que já foi
 * compartilhado nunca vira 404 — e passou a fazer duas coisas, conforme
 * quem chega:
 *
 * - **Com sessão**, redireciona para `/c/<comunidade>?t=<topico>`, que é
 *   o painel.
 * - **Sem conta**, continua mostrando a tela de convite (F14), com a
 *   capa, o nome, os membros e a pergunta — nunca as respostas (RN16).
 *
 * A segunda metade é o motivo de a rota continuar inteira. É este o link
 * que chega pelo WhatsApp: a prévia (capa, nome, abertura) sai do
 * `generateMetadata` daqui, e quem abre sem conta precisa ver onde está
 * antes de ver um painel dentro de uma tela que não conhece.
 *
 * O cookie que devolve a pessoa a este tópico no fim do cadastro (RN31)
 * é gravado pelo proxy, nesta rota, e continua funcionando.
 */
export default async function TopicoPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ convite?: string; ordem?: string }>;
}) {
  const { viewer, slugs, dados } = await carregar(params);

  if (viewer.kind === "member") {
    /*
     * A ordem (`?ordem=`) viaja junto: um link compartilhado com "mais
     * antigas" tem de abrir o painel em "mais antigas", senão o endereço
     * compartilhável deixa de ser compartilhável.
     */
    const { ordem } = await searchParams;
    const destino = enderecoDoTopico(slugs.comunidade, slugs.topico);
    redirect(ordem ? `${destino}&ordem=${encodeURIComponent(ordem)}` : destino);
  }

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
