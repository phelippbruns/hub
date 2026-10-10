import { cache } from "react";
import { paginaDaComunidade } from "@/lib/data/comunidades";
import { getViewer } from "@/lib/auth/session";

/**
 * A comunidade da rota, lida uma vez por requisição.
 *
 * A página e o painel da direita são árvores separadas (o painel é uma rota
 * paralela), e as duas precisam da mesma comunidade. O `cache` do React faz a
 * segunda chamada reaproveitar a primeira em vez de ir ao banco de novo.
 */
export const comunidadeDaRota = cache(async (slug: string) => {
  const viewer = await getViewer();
  return { viewer, comunidade: await paginaDaComunidade(viewer, slug) };
});
