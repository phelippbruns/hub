import type { Metadata } from "next";

/**
 * A prévia de um link do Hub, dentro e fora dele (F14, item 7).
 *
 * Leva nome, intro e capa — **nunca o texto das respostas**. O escopo põe
 * indexação por buscadores fora: respostas fechadas não combinam com página
 * aberta a robô, então quem chega sem conta recebe `noindex`.
 *
 * Com conta a página é a de sempre, e aí indexar nem faz sentido: ela é
 * diferente para cada pessoa.
 */
export function metadataCompartilhavel({
  titulo,
  descricao,
  capaUrl,
  semConta,
}: {
  titulo: string;
  descricao: string;
  capaUrl: string | null;
  semConta: boolean;
}): Metadata {
  return {
    title: `${titulo} · Hub`,
    description: descricao,
    openGraph: {
      title: titulo,
      description: descricao,
      siteName: "Hub",
      type: "website",
      ...(capaUrl ? { images: [{ url: capaUrl }] } : {}),
    },
    ...(semConta ? { robots: { index: false, follow: false } } : {}),
  };
}
