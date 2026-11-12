import { z } from "zod";
import {
  LIMITE_DO_CORPO,
  LIMITE_DO_SUBTITULO,
  MAXIMO_DE_BLOCOS,
} from "@/features/perfil/blog/shared";

/**
 * O corpo do post: validar o que chega e montar o documento guardado.
 *
 * **O navegador manda a estrutura, nunca o documento pronto.** Ele diz "um
 * parágrafo com este texto, depois uma imagem que é o arquivo 0" — e é o
 * servidor que escreve o JSON e que decide o `src` de cada imagem.
 *
 * Isso é mais forte do que validar um documento enviado pronto, que era o
 * que o Tiptap pediria: **não existe caminho pelo qual um `src` forjado
 * chegue ao documento.** Um nó de imagem apontando para um servidor
 * qualquer seria buscado pelo navegador de todo mundo que lesse o post —
 * um rastreador de IP dentro do Hub. Aqui o endereço de imagem enviada é
 * gerado pelo depósito, e o de GIF passa pela mesma conferência de domínio
 * que a contribuição já faz.
 */

/** GIF do GIPHY: a mesma conferência que `features/respostas/actions.ts`. */
const ehDoGiphy = (valor: string) => /^https:\/\/[a-z0-9.-]*giphy\.com\//i.test(valor);

const medida = z.coerce.number().int().positive().max(10_000);

/**
 * O que a tela manda, por bloco.
 *
 * `arquivo` é o **índice** do arquivo no formulário, não um caminho: o
 * caminho é o que o depósito devolve depois de conferir e reduzir.
 */
export const blocoEnviadoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("paragrafo"), texto: z.string().trim().min(1) }),
  z.object({
    tipo: z.literal("subtitulo"),
    texto: z.string().trim().min(1).max(LIMITE_DO_SUBTITULO),
  }),
  z.object({ tipo: z.literal("imagem"), arquivo: z.number().int().min(0).max(MAXIMO_DE_BLOCOS) }),
  z.object({
    tipo: z.literal("gif"),
    url: z.string().url().refine(ehDoGiphy, "Esse GIF não veio do GIPHY"),
    largura: medida,
    altura: medida,
  }),
]);

export type BlocoEnviado = z.infer<typeof blocoEnviadoSchema>;

export const corpoEnviadoSchema = z
  .array(blocoEnviadoSchema)
  .min(1, "Escreva o post")
  .max(MAXIMO_DE_BLOCOS, "O post tem blocos demais")
  .superRefine((blocos, ctx) => {
    const caracteres = blocos
      .filter((b) => b.tipo === "paragrafo" || b.tipo === "subtitulo")
      .reduce((total, b) => total + b.texto.length, 0);

    if (caracteres > LIMITE_DO_CORPO) {
      ctx.addIssue({
        code: "custom",
        message: `O texto passa de ${LIMITE_DO_CORPO.toLocaleString("pt-BR")} caracteres`,
      });
    }

    // Post só de imagem não é post: o título diz do que se trata, e o
    // corpo tem de dizer alguma coisa.
    if (!blocos.some((b) => b.tipo === "paragrafo")) {
      ctx.addIssue({ code: "custom", message: "Escreva ao menos um parágrafo" });
    }
  });

type Caminho = { src: string; largura?: number; altura?: number };

/**
 * Monta o documento guardado a partir dos blocos e das mídias já
 * resolvidas pelo servidor.
 *
 * O formato é o do Tiptap — `doc`, `paragraph`, `heading`, `image` — para
 * que trocar o editor depois não migre dado nenhum. O renderizador em
 * `features/perfil/blog/documento.tsx` já lê exatamente isto.
 */
export function montarDocumento(blocos: BlocoEnviado[], midias: Caminho[]): unknown {
  let proxima = 0;

  const content = blocos.map((bloco) => {
    switch (bloco.tipo) {
      case "paragrafo":
        return { type: "paragraph", content: [{ type: "text", text: bloco.texto }] };
      case "subtitulo":
        return {
          type: "heading",
          attrs: { level: 2 },
          content: [{ type: "text", text: bloco.texto }],
        };
      case "imagem":
      case "gif": {
        const midia = midias.at(proxima);
        proxima += 1;
        if (!midia) return null;
        return {
          type: "image",
          attrs: { src: midia.src, alt: "", largura: midia.largura, altura: midia.altura },
        };
      }
    }
  });

  return { type: "doc", content: content.filter((no) => no !== null) };
}

/**
 * O texto puro do corpo, para o resumo da lista e para o tempo de leitura.
 *
 * Gerado **no servidor**, como você pediu: a tela calculando daria dois
 * resumos diferentes para o mesmo post, e o da lista é lido por quem ainda
 * não abriu nada.
 */
export function textoPuro(blocos: BlocoEnviado[]): string {
  return blocos
    .filter((b) => b.tipo === "paragrafo" || b.tipo === "subtitulo")
    .map((b) => b.texto)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
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
