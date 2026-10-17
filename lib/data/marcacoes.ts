/**
 * Quem existe, entre o que foi marcado no texto.
 *
 * O analisador ([lib/texto/marcacoes.ts](../texto/marcacoes.ts)) acha `@`,
 * `#` e `*`; aqui o banco diz quais são reais. O que não for encontrado
 * continua texto comum na tela — link quebrado é pior do que texto, e o Hub
 * não inventa que aquela pessoa, comunidade ou tópico existe.
 *
 * Tudo em três consultas para a lista inteira de respostas, nunca uma por
 * resposta: vinte respostas com marcação viravam sessenta idas ao banco.
 */
import { prisma } from "./prisma";
import { alvosMarcados, type MarcacoesExistentes } from "@/lib/texto/marcacoes";

/**
 * Resolve as marcações de vários textos de uma vez.
 *
 * `communityId` é a comunidade onde os textos vivem: o `*` **só alcança os
 * tópicos dela**, porque o endereço de tópico é único por comunidade e não
 * no Hub inteiro. Sem esse limite, `*primeira-festa` abriria o tópico de
 * qualquer comunidade que tivesse um com o mesmo endereço.
 */
export async function marcacoesQueExistem(
  textos: string[],
  communityId: string | null,
): Promise<MarcacoesExistentes> {
  const pessoas = new Set<string>();
  const comunidades = new Set<string>();
  const topicos = new Set<string>();

  for (const texto of textos) {
    const alvos = alvosMarcados(texto);
    alvos.pessoas.forEach((a) => pessoas.add(a));
    alvos.comunidades.forEach((a) => comunidades.add(a));
    alvos.topicos.forEach((a) => topicos.add(a));
  }

  const [perfis, achadas, achados] = await Promise.all([
    pessoas.size === 0
      ? []
      : prisma.profile.findMany({
          where: { handle: { in: [...pessoas] }, deletedAt: null },
          select: { handle: true },
        }),
    comunidades.size === 0
      ? []
      : prisma.community.findMany({
          where: { slug: { in: [...comunidades] }, deletedAt: null },
          select: { slug: true },
        }),
    topicos.size === 0 || !communityId
      ? []
      : prisma.topic.findMany({
          where: { slug: { in: [...topicos] }, communityId, deletedAt: null },
          select: { slug: true },
        }),
  ]);

  return {
    pessoas: new Set(perfis.map((p) => p.handle)),
    comunidades: new Set(achadas.map((c) => c.slug)),
    topicos: new Set(achados.map((t) => t.slug)),
  };
}

/** O que existe neste texto, em listas — é o que a tela recebe por resposta. */
export function marcacoesDoTexto(texto: string, existentes: MarcacoesExistentes) {
  const alvos = alvosMarcados(texto);
  return {
    pessoas: alvos.pessoas.filter((a) => existentes.pessoas.has(a)),
    comunidades: alvos.comunidades.filter((a) => existentes.comunidades.has(a)),
    topicos: alvos.topicos.filter((a) => existentes.topicos.has(a)),
  };
}
