import Link from "next/link";
import { ContentColumn, PageTitle, ProfileHeader } from "@/design/components";
import { AbasDoPerfil } from "./abas";
import { AbaComunidades, AbaContribuicoes } from "./corpo";
import { fundoDaPagina } from "./fundos";
import { AcoesDoPerfil } from "./acoes-do-perfil";
import { Colecao, type AgrupamentoDaColecao } from "./colecao";
import { comunidadesDoPerfil, perfilNaTela, respostasDoPerfil } from "@/lib/data/perfil";
import { getCollection } from "@/lib/data/follows";
import { getViewer } from "@/lib/auth/session";

type Aba = "contribuicoes" | "comunidades" | "colecao";

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
}: {
  handle: string;
  aba?: string;
  ordem?: string;
}) {
  const viewer = await getViewer();
  const perfil = await perfilNaTela(viewer, handle);

  const base = perfil.souEu ? "/perfil" : `/${perfil.handle}`;
  const abaAtual: Aba =
    aba === "comunidades"
      ? "comunidades"
      : aba === "colecao" && perfil.souEu
        ? "colecao"
        : "contribuicoes";

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
      <ContentColumn>
        {/*
          No perfil de outra pessoa o @ já é o título — repeti-lo acima
          mostraria a mesma palavra duas vezes, como o protótipo não faz.
        */}
        {perfil.souEu ? <PageTitle>Perfil</PageTitle> : null}

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
          comoTitulo={!perfil.souEu}
          seguidores={perfil.seguidores}
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

        <AbasDoPerfil base={base} atual={abaAtual} comColecao={perfil.souEu} />

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
