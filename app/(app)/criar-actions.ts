"use server";

/**
 * A lista de comunidades do menu de criar.
 *
 * **Carregada quando a janela abre, e não a cada página.** A barra lateral
 * está em toda tela autenticada; buscar as comunidades no layout custaria
 * uma consulta em cada navegação do Hub para alimentar uma janela que
 * quase nunca abre.
 *
 * Mora em `app/(app)/` porque é daqui que o menu é montado — ele compõe
 * duas features (tópicos e comunidades), e uma feature não importa de
 * outra.
 */
import { getViewer } from "@/lib/auth/session";
import { UnauthenticatedError } from "@/lib/data/errors";
import { minhasComunidades } from "@/lib/data/comunidades";
import { meuHandle } from "@/lib/data/profiles";
import { comunidadesSemVagaHoje } from "@/lib/data/topics";

export type ComunidadeParaCriar = { slug: string; nome: string; jaUsouODia: boolean };

/**
 * As comunidades de que a pessoa participa, com o limite do dia de cada
 * uma (RN07).
 *
 * `minhasComunidades` já filtra por participação e exclui banida e
 * apagada — era um item do pedido do PO que já estava certo.
 */
export async function comunidadesParaCriarTopico(): Promise<ComunidadeParaCriar[]> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();

  const [comunidades, semVaga] = await Promise.all([
    minhasComunidades(viewer),
    comunidadesSemVagaHoje(viewer),
  ]);

  return comunidades.map((comunidade) => ({
    slug: comunidade.slug,
    nome: comunidade.name,
    jaUsouODia: semVaga.has(comunidade.id),
  }));
}

/**
 * O `@` de quem está criando, para o editor de post do menu.
 *
 * Carregado quando a janela abre, pela mesma razão das comunidades: a barra
 * está em toda tela autenticada, e o editor quase nunca abre.
 *
 * O servidor não confia neste valor para nada que importe — ele serve para
 * revalidar `/<handle>` depois de publicar. Quem escreve o post é sempre a
 * sessão, conferida dentro de `salvarPost`.
 */
export async function meuHandleParaCriar(): Promise<string> {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return meuHandle(viewer);
}
