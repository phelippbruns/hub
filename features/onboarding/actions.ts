"use server";

/**
 * Server Actions do onboarding (RN31, RN34).
 *
 * A regra das 3 comunidades é conferida aqui e em `lib/data/onboarding.ts`.
 * O botão desativado na tela é conveniência; quem enviar o formulário por fora
 * dela não passa.
 */
import { redirect } from "next/navigation";
import { z } from "zod";
import { concluirOnboarding, registrarEscolhaDeNotificacoes } from "@/lib/data/onboarding";
import { getViewer } from "@/lib/auth/session";
import { lerConvite, limparConvite } from "@/lib/auth/convite";
import { RuleViolationError } from "@/lib/data/errors";
import { MINIMO_DE_COMUNIDADES, type EstadoDoOnboarding } from "./shared";

const escolhaSchema = z.object({
  comunidades: z
    .array(z.uuid())
    .min(MINIMO_DE_COMUNIDADES, `Escolha ao menos ${MINIMO_DE_COMUNIDADES} comunidades`),
});

export async function escolherComunidades(
  _estado: EstadoDoOnboarding,
  formData: FormData,
): Promise<EstadoDoOnboarding> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");

  // Vários campos com o mesmo nome viram uma lista.
  const parsed = escolhaSchema.safeParse({
    comunidades: formData.getAll("comunidades").map(String),
  });

  if (!parsed.success) {
    return { erro: `Escolha ao menos ${MINIMO_DE_COMUNIDADES} comunidades para continuar` };
  }

  try {
    await concluirOnboarding(viewer, parsed.data.comunidades);
  } catch (error) {
    if (error instanceof RuleViolationError) return { erro: error.message };
    throw error;
  }

  redirect("/boas-vindas/notificacoes");
}

/**
 * RN31: o onboarding termina pedindo permissão de notificações, e
 * **recusar não bloqueia o uso**.
 *
 * RN31 também: quem chegou por convite volta para o tópico do link, não para
 * o Início. O convite é consumido aqui — depois de usado, não deve sobrar
 * para a próxima conta criada no mesmo navegador.
 */
export async function concluir(formData: FormData): Promise<void> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");

  await registrarEscolhaDeNotificacoes(viewer, formData.get("aceitou") === "sim");

  const convite = await lerConvite();
  if (convite) {
    await limparConvite();
    redirect(`/topico/${convite}`);
  }

  redirect("/inicio");
}
