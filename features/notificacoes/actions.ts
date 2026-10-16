"use server";

/**
 * Preferências de notificação (RN34).
 *
 * Regra de segurança 5: confere a sessão antes de agir, e o id de quem pede
 * vem da sessão.
 */
import { revalidatePath } from "next/cache";
import { getViewer } from "@/lib/auth/session";
import { UnauthenticatedError } from "@/lib/data/errors";
import { definirPreferenciaDeNotificacao } from "@/lib/data/profiles";

export async function salvarPreferencia(formulario: FormData) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();

  await definirPreferenciaDeNotificacao(
    viewer,
    String(formulario.get("campo") ?? ""),
    formulario.get("ligado") === "sim",
  );

  revalidatePath("/configuracoes");
}
