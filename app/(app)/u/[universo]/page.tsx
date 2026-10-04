import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ContentColumn, EmptyState, LevelMark } from "@/design/components";
import { BackIcon } from "@/design/icons";
import { ControlesDoUniverso } from "@/features/descoberta/universo";
import { LinhaComunidade } from "@/features/descoberta/linhas";
import { getViewer } from "@/lib/auth/session";
import { comunidadesDoUniverso, type OrdemDoUniverso } from "@/lib/data/descoberta";
import { NotFoundError } from "@/lib/data/errors";

export const metadata: Metadata = { title: "Universo · Hub" };

/**
 * Tela 11: página do Universo.
 *
 * RN02: Universos são criados e moderados somente pela plataforma — daí a
 * frase "Universo mantido pelo Hub".
 */
export default async function UniversoPage({
  params,
  searchParams,
}: {
  params: Promise<{ universo: string }>;
  searchParams: Promise<{ q?: string; ordem?: string }>;
}) {
  const viewer = await getViewer();
  const { universo: slug } = await params;
  const { q, ordem } = await searchParams;

  const ordemAtual: OrdemDoUniverso = ordem === "recentes" ? "recentes" : "atividade";

  let dados;
  try {
    dados = await comunidadesDoUniverso(viewer, slug, { termo: q, ordem: ordemAtual });
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  const { universo, comunidades } = dados;

  return (
    <ContentColumn>
      <header className="flex items-center gap-2">
        <Link href="/comunidades" aria-label="Voltar para Explorar">
          <BackIcon decorative className="size-icon" />
        </Link>
        <LevelMark level="universe" />
        <h1 className="text-title text-ink">{universo.name}</h1>
      </header>

      <p className="text-caption text-inkMuted">
        Universo mantido pelo Hub. {comunidades.length}{" "}
        {comunidades.length === 1 ? "comunidade" : "comunidades"}. Toque no # para entrar em uma
        comunidade.
      </p>

      <ControlesDoUniverso
        slug={slug}
        nomeDoUniverso={universo.name}
        termoInicial={q ?? ""}
        ordem={ordemAtual}
      />

      {comunidades.length === 0 ? (
        <EmptyState
          title={q ? `Nada encontrado para "${q}"` : "Nenhuma comunidade ainda"}
          description={
            q
              ? "Tente outro termo dentro deste Universo."
              : "Comunidades aparecem aqui a partir de 20 membros."
          }
        />
      ) : (
        <div className="flex flex-col gap-2">
          {comunidades.map((comunidade) => (
            <LinhaComunidade key={comunidade.id} comunidade={comunidade} mostrarRespostasHoje />
          ))}
        </div>
      )}
    </ContentColumn>
  );
}
