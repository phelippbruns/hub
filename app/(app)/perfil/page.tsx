import type { Metadata } from "next";
import { TelaDePerfil } from "@/features/perfil/tela";
import { getViewer } from "@/lib/auth/session";
import { meuHandle } from "@/lib/data/profiles";

export const metadata: Metadata = { title: "Perfil · Hub" };

/** Tela 21: o perfil próprio, com a Coleção. */
export default async function PerfilPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; ordem?: string }>;
}) {
  const { aba, ordem } = await searchParams;
  const viewer = await getViewer();
  const handle = await meuHandle(viewer);

  return <TelaDePerfil handle={handle} aba={aba} ordem={ordem} />;
}
