import type { Metadata } from "next";
import { ContentColumn, EmptyState, PageTitle, SectionTitle } from "@/design/components";
import { CampoDeBusca, type Filtro } from "@/features/descoberta/campo-de-busca";
import { LinhaComunidade, LinhaPessoa, LinhaTopico } from "@/features/descoberta/linhas";
import { getViewer } from "@/lib/auth/session";
import { buscarComunidades, buscarPessoas, buscarTopicos } from "@/lib/data/descoberta";

export const metadata: Metadata = { title: "Busca · Hub" };

/**
 * Tela 10: resultado da busca.
 *
 * Mesmo campo e mesmos filtros de Explorar — é a mesma tela, com termo.
 *
 * A busca **não aplica o corte de 20 membros** da RN05: quem procura pelo
 * nome encontra, por menor que a comunidade seja.
 */
export default async function BuscaPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; f?: string }>;
}) {
  const viewer = await getViewer();
  const { q, f } = await searchParams;
  const termo = q?.trim() ?? "";
  const filtro = (f as Filtro) ?? "tudo";

  const mostra = (secao: Filtro) => filtro === "tudo" || filtro === secao;

  const [comunidades, topicos, pessoas] = await Promise.all([
    mostra("comunidades") ? buscarComunidades(viewer, termo) : [],
    mostra("topicos") ? buscarTopicos(viewer, termo) : [],
    mostra("pessoas") ? buscarPessoas(viewer, termo) : [],
  ]);

  const nada = comunidades.length === 0 && topicos.length === 0 && pessoas.length === 0;

  return (
    <ContentColumn>
      <PageTitle>Explorar</PageTitle>
      <CampoDeBusca termoInicial={termo} filtro={filtro} />

      {nada ? (
        <EmptyState
          title={`Nada encontrado para "${termo}"`}
          description="Tente outro termo, ou veja os Universos em Explorar."
        />
      ) : null}

      {comunidades.length > 0 ? (
        <>
          <SectionTitle>Comunidades</SectionTitle>
          <div className="flex flex-col gap-2">
            {comunidades.map((comunidade) => (
              <LinhaComunidade key={comunidade.id} comunidade={comunidade} />
            ))}
          </div>
        </>
      ) : null}

      {topicos.length > 0 ? (
        <>
          <SectionTitle>Tópicos</SectionTitle>
          <div className="flex flex-col gap-2">
            {topicos.map((topico) => (
              <LinhaTopico key={topico.id} topico={topico} />
            ))}
          </div>
        </>
      ) : null}

      {pessoas.length > 0 ? (
        <>
          <SectionTitle>Pessoas</SectionTitle>
          <div className="flex flex-col gap-2">
            {pessoas.map((pessoa) => (
              <LinhaPessoa key={pessoa.id} pessoa={pessoa} />
            ))}
          </div>
        </>
      ) : null}
    </ContentColumn>
  );
}
