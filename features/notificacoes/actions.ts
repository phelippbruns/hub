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
import { marcarNotificacaoComoAtendida } from "@/lib/data/notificacoes";

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

/**
 * A pessoa clicou num aviso e foi ao destino (tela 8).
 *
 * Não revalida nada: a navegação já leva para outra tela, e revalidar
 * `/notificacoes` aqui renderizaria no servidor uma página que ninguém está
 * olhando. Quando a pessoa voltar, a central é `force-dynamic` como o resto
 * do Hub e já vem com o aviso fora do topo.
 */
export async function atenderNotificacao(id: string) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();

  await marcarNotificacaoComoAtendida(viewer, id);
}
