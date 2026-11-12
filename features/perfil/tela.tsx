import { Suspense } from "react";
import { cookies } from "next/headers";
import Link from "next/link";
import { ContentColumn, ProfileHeader } from "@/design/components";
import { AbasDoPerfil } from "./abas";
import { AbaComunidades, AbaContribuicoes } from "./corpo";
import { fundoDaPagina } from "./fundos";
import { AcoesDoPerfil } from "./acoes-do-perfil";
import { PilulaDeStatus } from "./status";
import { Colecao, type AgrupamentoDaColecao } from "./colecao";
import { AbaBlog } from "./blog/lista";
import { postsDoPerfil, postPorEndereco } from "@/lib/data/blog";
import { NotFoundError } from "@/lib/data/errors";
import { PainelDoPost } from "./blog/painel";
import { CorpoDoPost } from "./blog/corpo";
import { COOKIE_DO_POST, larguraDoPainelDoPost } from "./blog/shared";
import { comunidadesDoPerfil, perfilNaTela, respostasDoPerfil } from "@/lib/data/perfil";
import { getCollection } from "@/lib/data/follows";
import { getViewer } from "@/lib/auth/session";
import { gifEstaLigado } from "@/lib/midia/giphy";

type Aba = "blog" | "contribuicoes" | "comunidades" | "colecao";

/**
 * A tela de perfil, própria ou de outra pessoa (telas 21 e 24).
 *
 * É uma só porque a diferença entre as duas é pequena e **regrada**: quem é
 * dono vê a Coleção e o número de pessoas que segue; quem é visitante vê os
 * botões de seguir e Cabine. Duas telas separadas divergiriam no resto sem
 * ninguém decidir isso.
 *
 * Na web fica centralizada e sem painel lateral (item 8).
 */
export async function TelaDePerfil({
  handle,
  aba,
  ordem,
  post,
}: {
  handle: string;
  aba?: string;
  ordem?: string;
  /** O endereço do post aberto no painel ao lado (`?post=`). */
  post?: string;
}) {
  const viewer = await getViewer();
  const perfil = await perfilNaTela(viewer, handle);

  const base = perfil.souEu ? "/perfil" : `/${perfil.handle}`;
  /*
   * **Blog é o padrão**, inclusive em perfil sem post nenhum (decisão do PO
   * em 9 de novembro de 2026).
   *
   * A Coleção não é mais aba — ela vive no menu de três pontos do dono —,
   * mas `?aba=colecao` **continua aceito**: endereço que já existiu nunca
   * vira 404, e é por ele que o item do menu abre. Para visitante ela cai
   * no padrão, como qualquer valor desconhecido.
   */
  const abaAtual: Aba =
    aba === "contribuicoes"
      ? "contribuicoes"
      : aba === "comunidades"
        ? "comunidades"
        : aba === "colecao" && perfil.souEu
          ? "colecao"
          : "blog";

  /* A Coleção não tem aba, então a fila fica no Blog enquanto ela está aberta. */
  const abaDaFila = abaAtual === "colecao" ? "blog" : abaAtual;

  // "universo" sumiu na F12.1; endereço antigo com ?ordem=universo cai no
  // padrão em vez de quebrar.
  const agrupamento: AgrupamentoDaColecao = ordem === "comunidade" ? "comunidade" : "recente";

  const fundo = fundoDaPagina(perfil.backgroundKey);

  return (
    /*
      A cor escolhida pinta a área de conteúdo, não a barra de navegação: a
      barra é do Hub e é a mesma em toda tela, e tingi-la faria a navegação
      mudar de cor conforme o perfil visitado.
    */
    <div className={`${fundo.pagina} min-h-screen`}>
      {/*
        **Sem `?post=`, isto é exatamente o perfil de antes.** O painel é
        irmão da coluna e só nasce quando há post aberto — é como a
        comunidade já funciona, onde o `PainelAoLado` só é montado se
        `searchParams.t` existe. A F12 decidiu que o perfil é centralizado
        e sem coluna fixa, e isso continua valendo: o painel é transitório.
      */}
      <div className="flex items-start">
        <div className="min-w-0 flex-1">
          <ContentColumn>
            <ProfileHeader
              nome={perfil.name}
              handle={perfil.handle}
              bio={perfil.bio}
              avatarUrl={perfil.avatarUrl}
              enquadramento={perfil.enquadramento}
              medidasDaFoto={perfil.medidasDaFoto}
              links={perfil.links}
              contribuicoes={perfil.contribuicoes}
              comunidades={perfil.comunidades}
              seguidores={perfil.seguidores}
              seguidoresHref={perfil.souEu ? "/perfil/seguindo?aba=seguidores" : undefined}
              status={<PilulaDeStatus status={perfil.status} souEu={perfil.souEu} />}
              seguindo={
                /*
              RN27: só o dono vê, e só para ele a lista abre. Continua sendo
              link: é o único caminho do perfil para `/perfil/seguindo`, e
              transformá-lo em texto deixaria a tela sem porta de entrada.
            */
                perfil.seguindo === null ? null : (
                  <Link href="/perfil/seguindo" className="underline underline-offset-2">
                    {perfil.seguindo.toLocaleString("pt-BR")} seguindo
                  </Link>
                )
              }
              acoes={
                <AcoesDoPerfil
                  souEu={perfil.souEu}
                  profileId={perfil.id}
                  handle={perfil.handle}
                  nome={perfil.name}
                  seguindoInicial={perfil.euSigo}
                  convitePendente={perfil.convitePendente}
                  bloqueadoInicial={perfil.euBloqueei}
                  silenciadoInicial={perfil.euSilenciei}
                />
              }
            />

            <AbasDoPerfil base={base} atual={abaDaFila} />

            {abaAtual === "blog" ? (
              <AbaBlog
                posts={await postsDoPerfil(viewer, perfil.id)}
                souEu={perfil.souEu}
                base={base}
                handle={perfil.handle}
                gifLigado={gifEstaLigado()}
                aberto={post}
              />
            ) : null}

            {abaAtual === "contribuicoes" ? (
              <AbaContribuicoes
                itens={await respostasDoPerfil(viewer, perfil.id)}
                cartao={fundo.cartao}
              />
            ) : null}

            {abaAtual === "comunidades" ? (
              <AbaComunidades
                itens={await comunidadesDoPerfil(viewer, perfil.id)}
                souEu={perfil.souEu}
                cartao={fundo.cartao}
              />
            ) : null}

            {abaAtual === "colecao" ? (
              <Colecao
                base={base}
                agrupamento={agrupamento}
                topicos={await colecaoPlana(viewer, perfil.id, agrupamento)}
              />
            ) : null}
          </ContentColumn>
        </div>

        {post ? (
          /*
            Em `<Suspense>` com `fallback={null}`: a existência do perfil já
            foi conferida acima, e o painel é o pedaço lento. Esta rota pode
            dar 404, então ela não tem `loading.tsx` — o sinal de espera vem
            daqui.
          */
          <Suspense fallback={null}>
            <PainelAoLado handle={perfil.handle} post={post} />
          </Suspense>
        ) : null}
      </div>
    </div>
  );
}

/**
 * O post aberto ao lado do perfil.
 *
 * Server Component, como o `PainelAoLado` da comunidade: ele busca o post
 * e desenha o miolo, e só a casca (alça, fechar, menu) é cliente.
 *
 * **Post que não existe some em silêncio**, sem derrubar o perfil: um
 * `?post=` velho de um post apagado não pode transformar a página inteira
 * numa tela de erro.
 */
async function PainelAoLado({ handle, post }: { handle: string; post: string }) {
  const viewer = await getViewer();

  let dados;
  try {
    dados = await postPorEndereco(viewer, handle, post);
  } catch (erro) {
    if (erro instanceof NotFoundError) return null;
    throw erro;
  }

  return (
    <PainelDoPost
      postId={dados.id}
      slug={dados.slug}
      titulo={dados.titulo}
      handle={handle}
      larguraInicial={larguraDoPainelDoPost((await cookies()).get(COOKIE_DO_POST)?.value)}
      souAutor={dados.souAutor}
      fixado={dados.fixado}
    >
      <CorpoDoPost post={dados} />
    </PainelDoPost>
  );
}

/**
 * A Coleção numa lista só.
 *
 * `getCollection` devolve grupos quando o agrupamento não é cronológico; a
 * tela ainda mostra uma lista, então achato aqui. Os cabeçalhos por grupo
 * entram quando a tela crescer — hoje seriam enfeite sobre poucos itens.
 */
async function colecaoPlana(
  viewer: Awaited<ReturnType<typeof getViewer>>,
  ownerId: string,
  agrupamento: AgrupamentoDaColecao,
) {
  const colecao = await getCollection(
    viewer,
    ownerId,
    agrupamento === "recente" ? "recent" : "community",
  );

  return colecao.flatMap((item) => ("topics" in item ? item.topics : [item]));
}
