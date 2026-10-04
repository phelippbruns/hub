import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { EscolherComunidades } from "@/features/onboarding/escolher-comunidades";
import { getViewer } from "@/lib/auth/session";
import { lerConvite } from "@/lib/auth/convite";
import {
  comunidadeDoConvite,
  jaFezOnboarding,
  listarUniversosComComunidades,
} from "@/lib/data/onboarding";

export const metadata: Metadata = { title: "Do que você gosta? · Hub" };

export default async function EscolherComunidadesPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");
  if (await jaFezOnboarding(viewer.profileId)) redirect("/inicio");

  const topicId = await lerConvite();
  const [universos, convite] = await Promise.all([
    listarUniversosComComunidades(),
    topicId ? comunidadeDoConvite(topicId) : null,
  ]);

  return (
    <main className="flex flex-col gap-4 py-4">
      <h1 className="text-title text-ink">Do que você gosta?</h1>
      <EscolherComunidades universos={universos} convite={convite} />
    </main>
  );
}
