import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Apresentacao } from "@/features/onboarding/apresentacao/carrossel";
import { getViewer } from "@/lib/auth/session";
import { lerConvite } from "@/lib/auth/convite";
import {
  comunidadeDoConvite,
  jaFezOnboarding,
  listarComunidadesParaEscolher,
} from "@/lib/data/onboarding";

export const metadata: Metadata = { title: "Como o Hub funciona · Hub" };

/**
 * Tela 5: a apresentação do Hub (RN31).
 *
 * Os seis primeiros cards mostram o produto funcionando; o sétimo é a
 * escolha das comunidades, que é o que conclui o onboarding e grava
 * `onboardedAt`.
 *
 * Quem **já** concluiu não é mandado embora: a marca do Hub na barra
 * lateral traz de volta para cá, e a tela vira revisão — os mesmos seis
 * cards, sem o sétimo. Redirecionar seria transformar a marca num atalho
 * que não leva a lugar nenhum, e esconder a explicação justamente de quem
 * voltou para relê-la.
 */
export default async function BoasVindasPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");
  const revisao = await jaFezOnboarding(viewer.profileId);

  const topicId = await lerConvite();
  const [comunidades, convite] = await Promise.all([
    listarComunidadesParaEscolher(),
    topicId ? comunidadeDoConvite(topicId) : null,
  ]);

  return <Apresentacao comunidades={comunidades} convite={convite} revisao={revisao} />;
}
