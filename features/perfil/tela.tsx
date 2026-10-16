import Link from "next/link";
import { ContentColumn, PageTitle, ProfileCounters, ProfileHeader } from "@/design/components";
import { AbasDoPerfil } from "./abas";
import { AbaComunidades, AbaRespostas } from "./corpo";
import { AcoesDoPerfil } from "./acoes-do-perfil";
import { Colecao, type AgrupamentoDaColecao } from "./colecao";
import { comunidadesDoPerfil, perfilNaTela, respostasDoPerfil } from "@/lib/data/perfil";
import { getCollection } from "@/lib/data/follows";
import { getViewer } from "@/lib/auth/session";

type Aba = "respostas" | "comunidades" | "colecao";

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
        : "respostas";

  // "universo" sumiu na F12.1; endereço antigo com ?ordem=universo cai no
  // padrão em vez de quebrar.
  const agrupamento: AgrupamentoDaColecao = ordem === "comunidade" ? "comunidade" : "recente";

  return (
    <ContentColumn>
      {/*
        No perfil de outra pessoa o nome já é o título — repeti-lo acima
        mostraria a mesma palavra duas vezes, como o protótipo não faz.
      */}
      {perfil.souEu ? <PageTitle>Perfil</PageTitle> : null}

      <ProfileHeader
        nome={perfil.name}
        handle={perfil.handle}
        bio={perfil.bio}
        avatarUrl={perfil.avatarUrl}
        comoTitulo={!perfil.souEu}
        seguidores={perfil.seguidores}
        seguindo={
          /* RN27: só o dono vê, e só para ele a lista abre. */
          perfil.seguindo === null ? null : (
            <Link href="/perfil/seguindo" className="underline">
              {perfil.seguindo.toLocaleString("pt-BR")} seguindo
            </Link>
          )
        }
        acoes={
          perfil.souEu ? (
            <div className="flex w-full gap-2">
              <Link href="/perfil/editar" className="flex-1">
                <span className="rounded-pill border-ink text-ink text-bodyStrong box-border block border-2 px-3 py-2 text-center">
                  Editar perfil
                </span>
              </Link>
              <Link href="/configuracoes" className="flex-1">
                <span className="rounded-pill border-ink text-ink text-bodyStrong box-border block border-2 px-3 py-2 text-center">
                  Configurações
                </span>
              </Link>
            </div>
          ) : (
            <AcoesDoPerfil
              profileId={perfil.id}
              handle={perfil.handle}
              nome={perfil.name}
              seguindoInicial={perfil.euSigo}
              bloqueadoInicial={perfil.euBloqueei}
              silenciadoInicial={perfil.euSilenciei}
            />
          )
        }
      />

      <ProfileCounters
        respostas={perfil.respostas}
        comunidades={perfil.comunidades}
        diasAtivos={perfil.diasAtivos}
      />

      <AbasDoPerfil base={base} atual={abaAtual} comColecao={perfil.souEu} />

      {abaAtual === "respostas" ? (
        <AbaRespostas itens={await respostasDoPerfil(viewer, perfil.id)} />
      ) : null}

      {abaAtual === "comunidades" ? (
        <AbaComunidades itens={await comunidadesDoPerfil(viewer, perfil.id)} />
      ) : null}

      {abaAtual === "colecao" ? (
        <Colecao
          base={base}
          agrupamento={agrupamento}
          topicos={await colecaoPlana(viewer, perfil.id, agrupamento)}
        />
      ) : null}
    </ContentColumn>
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
