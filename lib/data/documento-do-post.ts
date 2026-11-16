import { z } from "zod";
import { LIMITE_DO_CORPO, MAXIMO_DE_NOS } from "@/features/perfil/blog/shared";

/**
 * O corpo do post: validar o documento que chega e resolver as mídias dele.
 *
 * Desde 15 de novembro de 2026 o editor é o Tiptap, e o navegador manda o
 * **documento**, não uma lista de blocos. Antes era o servidor que montava
 * a árvore, e isso tornava impossível forjar o endereço de uma imagem — não
 * havia caminho pelo qual um `src` do navegador chegasse ao documento.
 *
 * **Essa impossibilidade continua de pé, e é a razão da forma deste
 * módulo.** O nó de imagem que o navegador manda carrega o **índice do
 * arquivo** (`arquivo: 0`) ou o endereço de um GIF do GIPHY — nunca um
 * `src`. Quem escreve o `src` é o servidor, com o caminho que `guardarImagem`
 * devolveu. Um nó com `src` não é recusado: ele é **ignorado**, porque o
 * schema não declara esse campo e o Zod descarta o que não declarou.
 *
 * Se fosse um `src` conferido em vez de um `src` impossível, bastaria um
 * furo na conferência para o navegador de **todo mundo que lesse o post**
 * buscar um endereço de fora — um rastreador de IP dentro do Hub.
 *
 * A segunda regra é a **lista fechada**: nó ou marca que o desenho
 * (`features/perfil/blog/documento.tsx`) não sabe desenhar é recusado aqui.
 * Aceitar o que não se desenha faria o texto sumir depois de publicado, que
 * é pior do que recusar na hora.
 */

/** GIF do GIPHY: a mesma conferência que `features/respostas/actions.ts`. */
const ehDoGiphy = (valor: string) => /^https:\/\/[a-z0-9.-]*giphy\.com\//i.test(valor);

const medida = z.coerce.number().int().positive().max(10_000);

/**
 * As marcas aceitas, e só elas.
 *
 * `bold`, `italic` e `link` — exatamente as três que o desenho aplica. Não
 * há `strike`, `code` nem `underline`: o `StarterKit` do Tiptap os
 * ofereceria, o desenho os ignoraria, e o texto voltaria sem a formatação
 * que a pessoa aplicou.
 *
 * **RN41: o link é a exceção do blog à RN16.** `http` e `https` apenas —
 * `javascript:` e `data:` recusados aqui, no servidor, e não só no desenho.
 * Quem desenha já põe `rel="noopener noreferrer nofollow"` e abre em outra
 * aba.
 */
const marcaSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("bold") }),
  z.object({ type: z.literal("italic") }),
  z.object({
    type: z.literal("link"),
    attrs: z.object({
      href: z
        .string()
        .max(2000)
        .refine((valor) => /^https?:\/\//i.test(valor), "O link precisa começar com http ou https"),
    }),
  }),
]);

const textoSchema = z.object({
  type: z.literal("text"),
  text: z.string().min(1),
  marks: z.array(marcaSchema).max(3).optional(),
});

const quebraSchema = z.object({ type: z.literal("hardBreak") });

/**
 * A imagem e o GIF, que é onde mora a defesa.
 *
 * `arquivo` é o **índice** do arquivo no formulário; `gif` é um endereço do
 * GIPHY, conferido como em toda outra mídia do Hub. Não há `src` — nem
 * declarado, nem opcional, nem ignorado com aviso. O que o navegador
 * mandar além disto é descartado pelo Zod antes de qualquer coisa ler.
 */
const imagemSchema = z.object({
  type: z.literal("image"),
  attrs: z.union([
    z.object({ arquivo: z.number().int().min(0).max(MAXIMO_DE_NOS) }),
    z.object({
      gif: z.string().url().refine(ehDoGiphy, "Esse GIF não veio do GIPHY"),
      largura: medida,
      altura: medida,
    }),
  ]),
});

type NoEnviado =
  | z.infer<typeof textoSchema>
  | z.infer<typeof quebraSchema>
  | z.infer<typeof imagemSchema>
  | { type: "paragraph"; content?: NoEnviado[] }
  | { type: "heading"; attrs: { level: 2 }; content?: NoEnviado[] }
  | { type: "blockquote"; content?: NoEnviado[] }
  | { type: "bulletList"; content?: NoEnviado[] }
  | { type: "orderedList"; content?: NoEnviado[] }
  | { type: "listItem"; content?: NoEnviado[] };

/**
 * O nó, recursivo.
 *
 * `heading` só no nível 2, porque o desenho desenha todo heading como
 * `<h2>` — nível 3 voltaria como 2, e um sumário fora de ordem é pior que
 * um sumário raso.
 */
const noSchema: z.ZodType<NoEnviado> = z.lazy(() =>
  z.discriminatedUnion("type", [
    textoSchema,
    quebraSchema,
    imagemSchema,
    z.object({ type: z.literal("paragraph"), content: z.array(noSchema).optional() }),
    z.object({
      type: z.literal("heading"),
      attrs: z.object({ level: z.literal(2) }),
      content: z.array(noSchema).optional(),
    }),
    z.object({ type: z.literal("blockquote"), content: z.array(noSchema).optional() }),
    z.object({ type: z.literal("bulletList"), content: z.array(noSchema).optional() }),
    z.object({ type: z.literal("orderedList"), content: z.array(noSchema).optional() }),
    z.object({ type: z.literal("listItem"), content: z.array(noSchema).optional() }),
  ]),
);

export type DocumentoEnviado = { type: "doc"; content: NoEnviado[] };

/**
 * O documento inteiro, com os limites que a RN39 pede.
 *
 * O teto de nós existe para o schema recursivo não virar porta de entrada:
 * uma árvore de cem mil nós custa memória antes de qualquer regra rodar.
 */
export const documentoEnviadoSchema = z
  .object({
    type: z.literal("doc"),
    content: z.array(noSchema).min(1, "Escreva o post").max(MAXIMO_DE_NOS),
  })
  .superRefine((documento, ctx) => {
    if (contarNos(documento.content) > MAXIMO_DE_NOS) {
      ctx.addIssue({ code: "custom", message: "O post tem blocos demais" });
    }

    const caracteres = textoPuro(documento).length;
    if (caracteres > LIMITE_DO_CORPO) {
      ctx.addIssue({
        code: "custom",
        message: `O texto passa de ${LIMITE_DO_CORPO.toLocaleString("pt-BR")} caracteres`,
      });
    }

    // Post só de imagem não é post: o título diz do que se trata, e o
    // corpo tem de dizer alguma coisa.
    if (textoPuro(documento).trim().length === 0) {
      ctx.addIssue({ code: "custom", message: "Escreva ao menos um parágrafo" });
    }
  });

function filhos(no: NoEnviado): NoEnviado[] {
  return "content" in no && Array.isArray(no.content) ? no.content : [];
}

function contarNos(nos: NoEnviado[]): number {
  return nos.reduce((total, no) => total + 1 + contarNos(filhos(no)), 0);
}

/** O que cada nó de imagem pede, na ordem em que aparece no documento. */
export type MidiaPedida = { arquivo: number } | { gif: string; largura: number; altura: number };

/**
 * As mídias que o documento pede, **na ordem dos nós**.
 *
 * É esta ordem que a ação usa para casar `imagem0`, `imagem1` com os nós, e
 * a mesma que `imagensDoCorpo` usa depois para assinar os endereços.
 */
export function midiasPedidas(documento: DocumentoEnviado): MidiaPedida[] {
  const achadas: MidiaPedida[] = [];

  const andar = (nos: NoEnviado[]) => {
    for (const no of nos) {
      if (no.type === "image") achadas.push(no.attrs as MidiaPedida);
      andar(filhos(no));
    }
  };

  andar(documento.content);
  return achadas;
}

type Caminho = { src: string; largura?: number; altura?: number };

/**
 * O documento guardado: o mesmo que chegou, com **o servidor escrevendo o
 * `src` de cada imagem**.
 *
 * As mídias vêm na ordem de `midiasPedidas`. Nó de imagem sem mídia
 * correspondente é descartado, em vez de virar imagem quebrada.
 *
 * O formato de saída não mudou com o Tiptap — `doc`, `paragraph`,
 * `heading`, `image`, com `largura`/`altura` em português — porque é o que
 * `features/perfil/blog/documento.tsx` lê e o que os posts já escritos
 * guardam. Trocar o editor não migrou dado nenhum.
 */
export function montarDocumento(documento: DocumentoEnviado, midias: Caminho[]): unknown {
  let proxima = 0;

  const converter = (no: NoEnviado): unknown => {
    if (no.type === "image") {
      const midia = midias.at(proxima);
      proxima += 1;
      if (!midia) return null;
      return {
        type: "image",
        attrs: { src: midia.src, alt: "", largura: midia.largura, altura: midia.altura },
      };
    }

    const dentro = filhos(no);
    if (dentro.length === 0) return no;
    return { ...no, content: dentro.map(converter).filter((filho) => filho !== null) };
  };

  return {
    type: "doc",
    content: documento.content.map(converter).filter((no) => no !== null),
  };
}

/**
 * O texto puro do corpo, para o resumo da lista e para o tempo de leitura.
 *
 * Gerado **no servidor**: a tela calculando daria dois resumos diferentes
 * para o mesmo post, e o da lista é lido por quem ainda não abriu nada.
 *
 * Anda a árvore inteira, e não só o primeiro nível — com listas e citações
 * o texto deixou de morar todo na superfície.
 */
export function textoPuro(documento: DocumentoEnviado): string {
  const pedacos: string[] = [];

  const andar = (nos: NoEnviado[]) => {
    for (const no of nos) {
      if (no.type === "text") pedacos.push(no.text);
      andar(filhos(no));
    }
  };

  andar(documento.content);
  return pedacos.join(" ").replace(/\s+/g, " ").trim();
}

/** O resumo que a lista mostra, cortado numa palavra inteira. */
export function resumoDoCorpo(texto: string, limite = 200): string {
  if (texto.length <= limite) return texto;
  const corte = texto.slice(0, limite - 1);
  const espaco = corte.lastIndexOf(" ");
  return `${(espaco > limite / 2 ? corte.slice(0, espaco) : corte).trimEnd()}…`;
}

/**
 * O tempo de leitura, em minutos.
 *
 * 200 palavras por minuto é a média adulta em leitura silenciosa, e o
 * mínimo é 1: "0 min de leitura" não é informação nenhuma.
 */
export function minutosDeLeitura(texto: string): number {
  const palavras = texto.split(" ").filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}
