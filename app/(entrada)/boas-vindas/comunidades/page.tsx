import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EscolherComunidades } from "@/features/onboarding/escolher-comunidades";
import { getViewer } from "@/lib/auth/session";
import { lerConvite } from "@/lib/auth/convite";
import {
  comunidadeDoConvite,
  jaFezOnboarding,
  listarComunidadesParaEscolher,
} from "@/lib/data/onboarding";

export const metadata: Metadata = { title: "Do que você gosta? · Hub" };

export default async function EscolherComunidadesPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");
  if (await jaFezOnboarding(viewer.profileId)) redirect("/inicio");

  const topicId = await lerConvite();
  const [comunidades, convite] = await Promise.all([
    listarComunidadesParaEscolher(),
    topicId ? comunidadeDoConvite(topicId) : null,
  ]);

  return (
    <main className="flex flex-col gap-4 py-4">
      <h1 className="text-title text-ink">Do que você gosta?</h1>
      <EscolherComunidades comunidades={comunidades} convite={convite} />
    </main>
  );
}
