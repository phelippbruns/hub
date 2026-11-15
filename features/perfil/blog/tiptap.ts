"use client";

import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";

/**
 * O Tiptap do Hub, podado ao que o desenho sabe desenhar.
 *
 * **A poda não é higiene, é correção.** `features/perfil/blog/documento.tsx`
 * desenha por `switch` com lista fechada, e nó desconhecido devolve `null` —
 * some em silêncio. Um botão de tachado na barra produziria uma marca que o
 * desenho ignora: a pessoa formata, publica, e o texto volta sem a
 * formatação. Texto que desaparece sem erro é pior que botão que não existe.
 *
 * O que fica de fora do `StarterKit`, e por quê:
 *
 * - `strike`, `code`, `codeBlock`, `horizontalRule`: o desenho não os tem;
 * - `heading` só no **nível 2**, porque o desenho desenha todo heading como
 *   `<h2>` — um `h3` voltaria como `h2`, e sumário fora de ordem atrapalha
 *   quem lê por leitor de tela;
 * - `link` entra configurado, não como vem: RN41 deixa o post ter endereços,
 *   e eles saem com `rel="noopener noreferrer nofollow"` em outra aba. Quem
 *   põe esses atributos é o desenho, não o editor.
 *
 * `design/components/post-formato.test.ts` compara esta lista com a do
 * desenho e reprova se discordarem.
 */

/**
 * A imagem do post, com **os atributos do Hub**.
 *
 * A extensão `Image` que vem do Tiptap guarda `src`, `width` e `height`.
 * Aqui é outra coisa de propósito:
 *
 * - `arquivo` é o **índice** do arquivo no formulário. Nunca um endereço —
 *   é o que torna impossível um `src` forjado chegar ao documento, e é a
 *   defesa mais importante do blog;
 * - `gif`, `largura` e `altura` servem ao GIF do GIPHY, que já vem medido e
 *   cujo domínio o servidor confere;
 * - `src` só existe no documento **guardado**, escrito pelo servidor.
 *
 * Ao carregar um post para editar, o servidor troca o `src` guardado pelo
 * endereço assinado e devolve o índice — ver `lib/data/blog.ts`.
 */
/** O que `setImage` aceita: ou um arquivo enviado, ou um GIF do GIPHY. */
export type AtributosDaImagem =
  { arquivo: number; previa?: string } | { gif: string; largura: number; altura: number };

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imagemDoPost: {
      /** Insere uma imagem pelo **índice do arquivo**, nunca por endereço. */
      setImage: (atributos: AtributosDaImagem) => ReturnType;
    };
  }
}

export const ImagemDoPost = Node.create({
  name: "image",
  group: "block",
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      arquivo: { default: null },
      gif: { default: null },
      largura: { default: null },
      altura: { default: null },
      /**
       * Só para desenhar **dentro do editor**. Nunca é enviado: o schema do
       * servidor não declara este campo, e o Zod descarta o que não declara.
       */
      previa: { default: null, rendered: false },
    };
  },

  parseHTML() {
    return [{ tag: "img[data-hub]" }];
  },

  renderHTML({ HTMLAttributes }) {
    const previa = HTMLAttributes.previa ?? HTMLAttributes.gif;
    return [
      "img",
      {
        "data-hub": "",
        src: typeof previa === "string" ? previa : "",
        alt: "",
        class: "rounded-sm max-w-full",
      },
    ];
  },

  addCommands() {
    return {
      setImage:
        (atributos: AtributosDaImagem) =>
        ({ commands }) =>
          commands.insertContent({ type: "image", attrs: atributos }),
    };
  },
});

export const extensoesDoPost = [
  StarterKit.configure({
    heading: { levels: [2] },
    strike: false,
    code: false,
    codeBlock: false,
    horizontalRule: false,
    link: {
      openOnClick: false,
      autolink: false,
      protocols: ["http", "https"],
      HTMLAttributes: { rel: "noopener noreferrer nofollow", target: "_blank" },
    },
  }),
  ImagemDoPost,
];

/** O documento como o editor o entrega, antes de o servidor validar. */
export type DocumentoDoEditor = { type: "doc"; content: unknown[] };
