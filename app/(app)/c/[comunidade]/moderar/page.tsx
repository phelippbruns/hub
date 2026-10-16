import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ContentColumn, PageTitle } from "@/design/components";
import { AbasDaModeracao } from "@/features/moderacao/abas";
import { FilaDeDenuncias } from "@/features/moderacao/fila";
import { MembrosDaComunidade } from "@/features/moderacao/membros";
import { Moderadores } from "@/features/moderacao/moderadores";
import { getViewer } from "@/lib/auth/session";
import {
  comunidadeParaModerar,
  filaDeDenuncias,
  membrosDaComunidade,
  moderadoresDaComunidade,
} from "@/lib/data/moderacao";

export const metadata: Metadata = { title: "Moderação da comunidade · Hub" };

/**
 * Tela 27: as ferramentas de quem modera.
 *
 * Quem não modera recebe **404**, não 403: "você não tem permissão"
 * confirmaria que a tela existe e que aquela comunidade tem moderação ali.
 *
 * Sem `loading.tsx`, como manda o CLAUDE.md para toda rota que pode dar 404:
 * o Suspense começaria a transmitir 200 antes de a página decidir.
 */
export default async function Page({
  params,
  searchParams,
}: {
  params: Promise<{ comunidade: string }>;
  searchParams: Promise<{ aba?: string; busca?: string }>;
}) {
  const { comunidade: slug } = await params;
  const { aba = "denuncias", busca = "" } = await searchParams;

  const viewer = await getViewer();
  const comunidade = await comunidadeParaModerar(viewer, slug);
  if (!comunidade) notFound();

  return (
    <ContentColumn>
      <PageTitle>Moderar</PageTitle>
      <p className="text-caption text-inkMuted">
        {comunidade.name}. {resumo(aba, comunidade.membersCount, comunidade.moderadores)}
      </p>

      <AbasDaModeracao base={`/c/${slug}/moderar`} atual={aba} />

      {aba === "membros" ? (
        <MembrosDaComunidade
          slug={slug}
          communityId={comunidade.id}
          nomeDaComunidade={comunidade.name}
          busca={busca}
          membros={(await membrosDaComunidade(viewer, comunidade.id, busca)).map(
            ({ id, nome, handle, moderador, criador, denuncias }) => ({
              id,
              nome,
              handle,
              moderador,
              criador,
              denuncias,
            }),
          )}
        />
      ) : aba === "moderadores" ? (
        <Moderadores
          slug={slug}
          communityId={comunidade.id}
          eu={comunidade.eu}
          moderadores={await moderadoresDaComunidade(viewer, comunidade.id)}
        />
      ) : (
        <FilaDeDenuncias
          slug={slug}
          communityId={comunidade.id}
          denuncias={(await filaDeDenuncias(viewer, comunidade.id)).map((denuncia) => ({
            id: denuncia.id,
            motivo: denuncia.motivo,
            detalhes: denuncia.detalhes,
            vezes: denuncia.vezes,
            trecho: denuncia.alvo.trecho,
            onde: denuncia.alvo.onde,
            autor: denuncia.alvo.autor
              ? { nome: denuncia.alvo.autor.nome, handle: denuncia.alvo.autor.handle }
              : null,
            // Perfil e comunidade não se "removem" pela fila: a ação sobre a
            // pessoa vive na aba Membros.
            podeRemover: denuncia.alvo.tipo === "answer" || denuncia.alvo.tipo === "topic",
          }))}
        />
      )}
    </ContentColumn>
  );
}

function resumo(aba: string, membros: number, moderadores: number): string {
  if (aba === "membros") return `${membros} ${membros === 1 ? "membro" : "membros"}.`;
  if (aba === "moderadores") {
    return `${moderadores} ${moderadores === 1 ? "moderador" : "moderadores"}.`;
  }
  return "Você modera aqui. Se sair, a moderação passa para o membro mais ativo.";
}
