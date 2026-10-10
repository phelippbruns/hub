import { notFound } from "next/navigation";
import { comunidadeDaRota } from "@/features/comunidades/dados";
import { PainelDaComunidade } from "@/features/comunidades/painel";
import { painelEstaOculto, topicosQueSigoAqui } from "@/lib/data/comunidades";
import { NotFoundError } from "@/lib/data/errors";

/**
 * O painel da direita da página da comunidade.
 *
 * É uma rota paralela, e não parte da página, porque o painel é da casca: as
 * folhas que abrem sobre o conteúdo (compartilhar, menu, sair) não podem
 * fazê-lo sumir, e ocultá-lo é preferência da pessoa, não estado de uma tela.
 *
 * A comunidade é lida pela mesma função cacheada da página, então o banco é
 * consultado uma vez só.
 */
export default async function PainelPage({ params }: { params: Promise<{ comunidade: string }> }) {
  const { comunidade: slug } = await params;

  let dados;
  let viewer;
  try {
    ({ comunidade: dados, viewer } = await comunidadeDaRota(slug));
  } catch (erro) {
    if (erro instanceof NotFoundError) notFound();
    throw erro;
  }

  if (await painelEstaOculto(viewer)) return null;

  const seguidos = await topicosQueSigoAqui(viewer, dados.id);
  return <PainelDaComunidade comunidade={dados} seguidos={seguidos} />;
}
