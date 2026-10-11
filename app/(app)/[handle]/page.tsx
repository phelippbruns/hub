import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { TelaDePerfil } from "@/features/perfil/tela";
import { getViewer } from "@/lib/auth/session";
import { perfilNaTela } from "@/lib/data/perfil";
import { NotFoundError } from "@/lib/data/errors";

type Params = Promise<{ handle: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { handle } = await params;
  return { title: `@${handle} · Hub` };
}

/**
 * Tela 24: o perfil de outra pessoa, na raiz (`hub.app/lia`).
 *
 * Quem abrir o próprio @ é mandado para `/perfil`: é o mesmo perfil, e ter
 * dois endereços para a mesma tela confundiria o que é "meu".
 */
export default async function PerfilDeOutraPessoaPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: Promise<{ aba?: string; ordem?: string }>;
}) {
  const { handle } = await params;
  const { aba, ordem } = await searchParams;

  const viewer = await getViewer();
  try {
    const perfil = await perfilNaTela(viewer, handle);
    if (perfil.souEu) redirect("/perfil");
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  return <TelaDePerfil handle={handle} aba={aba} ordem={ordem} />;
}
