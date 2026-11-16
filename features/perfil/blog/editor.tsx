"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import { Button, Input, Janela, RoundIconButton } from "@/design/components";
import { GifIcon, ImageIcon } from "@/design/icons";
import { EscolherGif, type GifEscolhido } from "@/design/components";
import { problemaNaImagem } from "@/lib/midia/limites";
import { enderecoDoPost } from "@/lib/rotas";
import { LIMITE_DO_CORPO, LIMITE_DO_TITULO } from "./shared";
import { extensoesDoPost, type DocumentoDoEditor } from "./tiptap";
import { salvarPost, type EstadoDoEditor } from "./actions";

/**
 * O editor de post: **texto rico, com Tiptap**.
 *
 * Substituiu o editor de blocos em 15 de novembro de 2026, por pedido do
 * PO. O que a dívida prometia se cumpriu: o formato guardado é o mesmo, o
 * desenho (`documento.tsx`) não mudou uma linha, e nenhum post existente
 * migrou.
 *
 * **O que mudou de verdade, e não estava na dívida:** antes o navegador
 * mandava uma lista de blocos e o servidor montava a árvore, o que tornava
 * **impossível** forjar o endereço de uma imagem. Agora o documento chega
 * pronto. A impossibilidade foi mantida de propósito: o nó de imagem carrega
 * o **índice do arquivo**, nunca um `src`, e quem escreve o `src` continua
 * sendo o depósito. Veja `lib/data/documento-do-post.ts`.
 *
 * **A barra oferece só o que o desenho sabe desenhar** — negrito, itálico,
 * subtítulo, lista, citação e link. O `StarterKit` ofereceria tachado,
 * código e linha divisória; o desenho os ignoraria, e o texto voltaria sem
 * a formatação aplicada. A poda está em `tiptap.ts`.
 */

/** Fora do componente: um literal novo a cada render trocaria as opções. */
const DOCUMENTO_VAZIO = { type: "doc", content: [{ type: "paragraph" }] };

export function EditorDePost({
  aberto,
  onFechar,
  handle,
  base,
  gifLigado,
}: {
  aberto: boolean;
  onFechar: () => void;
  handle: string;
  /** O endereço desta tela, para ir ao post depois de publicar. */
  base: string;
  gifLigado: boolean;
}) {
  return (
    <Janela titulo="Novo post" aberta={aberto} onFechar={onFechar}>
      {/* Montado só quando abre: cada abertura começa limpa, em vez de
          guardar o que foi escrito e desistido na vez anterior. */}
      {aberto ? (
        <FormularioDePost handle={handle} base={base} gifLigado={gifLigado} onFechar={onFechar} />
      ) : null}
    </Janela>
  );
}

/**
 * O miolo do editor, **sem a `Janela`**.
 *
 * Exportado porque o menu de criar da barra lateral
 * ([app/(app)/criar-menu.tsx]) já desenha a própria `Janela`: aninhar duas
 * prenderia o foco e o `Esc` em duas camadas, e fechar a de cima deixaria a
 * de baixo aberta sobre a página.
 */
export function FormularioDePost({
  handle,
  base,
  gifLigado,
  onFechar,
}: {
  handle: string;
  base: string;
  gifLigado: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [titulo, setTitulo] = useState("");
  const [capa, setCapa] = useState<File | null>(null);
  const [escolhendoGif, setEscolhendoGif] = useState(false);
  const [estado, enviar, enviando] = useActionState<EstadoDoEditor, FormData>(salvarPost, {});
  const arquivoRef = useRef<HTMLInputElement>(null);

  /*
   * Os arquivos escolhidos, na ordem em que entraram.
   *
   * O nó do documento guarda o **índice** nesta lista, e é este índice que
   * viaja no formulário como `imagem0`, `imagem1`. Guardar o `File` dentro
   * do documento não daria certo: o documento é serializado para JSON.
   */
  const [arquivos, setArquivos] = useState<File[]>([]);

  const editor = useEditor({
    extensions: extensoesDoPost,
    content: DOCUMENTO_VAZIO,
    // O Next avisa sobre diferença entre servidor e navegador se o editor
    // tentar desenhar na renderização do servidor.
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "text-body text-ink bg-surfacePage min-h-postEditor rounded-sm p-3 focus:outline-none",
        "aria-label": "Corpo do post",
      },
    },
  });

  /*
   * **`useEditorState`, e não um `setState` a cada transação.**
   *
   * A primeira versão escutava `transaction` e forçava uma renderização por
   * tecla. Medido em 15 de novembro de 2026: digitar "O que funcionou" num
   * subtítulo guardava **"u"** — o React remontava o `EditorContent` mais
   * rápido do que as teclas chegavam, e o texto se perdia sem erro nenhum.
   * Este hook lê o que a tela precisa e só redesenha quando o valor muda.
   */
  const estadoDoEditor = useEditorState({
    editor,
    selector: ({ editor: atual }) => ({
      caracteres: atual?.getText({ blockSeparator: " " }).trim().length ?? 0,
    }),
  });

  /*
   * Ir para o post publicado quando o servidor aceitou — e não no clique:
   * fechar antes da resposta esconderia o erro e deixaria a pessoa achando
   * que publicou.
   */
  useEffect(() => {
    if (!estado.salvo) return;
    onFechar();
    router.push(enderecoDoPost(base, estado.salvo));
  }, [estado.salvo, base, onFechar, router]);

  const caracteres = estadoDoEditor?.caracteres ?? 0;
  const temTexto = caracteres > 0;
  const problemaDaCapa = capa ? problemaNaImagem(capa) : null;

  const oQueFalta =
    problemaDaCapa ??
    (titulo.trim().length === 0
      ? "Dê um título ao post."
      : !temTexto
        ? "Escreva ao menos um parágrafo."
        : caracteres > LIMITE_DO_CORPO
          ? `O texto passa de ${LIMITE_DO_CORPO.toLocaleString("pt-BR")} caracteres.`
          : null);

  /** Acrescenta uma imagem ao documento, com o índice do arquivo. */
  function acrescentarImagem(arquivo: File) {
    const indice = arquivos.length;
    setArquivos((atuais) => [...atuais, arquivo]);
    editor?.chain().focus().setImage({ arquivo: indice }).run();
  }

  /** Acrescenta um GIF: ele já vem com endereço e medidas do GIPHY. */
  function acrescentarGif(gif: GifEscolhido) {
    editor
      ?.chain()
      .focus()
      .setImage({ gif: gif.url, largura: gif.largura, altura: gif.altura })
      .run();
  }

  /**
   * O que o servidor recebe: o documento **e** os arquivos, separados.
   *
   * O documento não tem `src` nenhum — cada nó de imagem leva o índice do
   * arquivo, e quem escreve o endereço é o depósito. É a mesma promessa do
   * editor de blocos, mantida com o editor novo.
   */
  function aoEnviar(dados: FormData) {
    const documento = editor?.getJSON() as DocumentoDoEditor | undefined;
    if (!documento) return;

    arquivos.forEach((arquivo, i) => dados.set(`imagem${i}`, arquivo));
    dados.set("documento", JSON.stringify(documento));
    dados.set("handle", handle);
    if (capa) dados.set("capa", capa);
    enviar(dados);
  }

  return (
    <form action={aoEnviar} className="flex flex-col gap-3">
      <Input
        name="titulo"
        label="Título"
        value={titulo}
        onChange={(evento) => setTitulo(evento.target.value)}
        maxLength={LIMITE_DO_TITULO}
        contador
        placeholder="Uma noite no galpão"
        autoFocus
      />

      <div className="flex flex-col gap-1">
        <span className="text-caption text-ink font-bold">Foto de capa</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={(evento) => setCapa(evento.target.files?.[0] ?? null)}
          aria-label="Foto de capa do post"
          className="text-caption text-inkMuted"
        />
        <p className="text-caption text-inkMuted">
          Aparece como prévia na lista. Sem capa, a prévia usa a primeira imagem do texto.
        </p>
      </div>

      {editor ? <BarraDeFormato editor={editor} /> : null}

      <EditorContent editor={editor} />

      <div className="flex flex-wrap items-center gap-2">
        {/*
          `sr-only` com `aria-hidden` e `tabIndex={-1}`, nunca `hidden`: o
          seletor do foco preso da `Janela` casa `input:not([disabled])`, e
          um input de `display:none` entra na lista sem poder receber foco.
        */}
        <input
          ref={arquivoRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(evento) => {
            const escolhido = evento.target.files?.[0];
            if (escolhido) acrescentarImagem(escolhido);
            // Limpa, senão escolher o mesmo arquivo duas vezes não dispara.
            evento.target.value = "";
          }}
        />

        <RoundIconButton label="Inserir imagem" onClick={() => arquivoRef.current?.click()}>
          <ImageIcon decorative className="size-icon" />
        </RoundIconButton>

        {gifLigado ? (
          <RoundIconButton label="Inserir GIF" onClick={() => setEscolhendoGif(true)}>
            <GifIcon decorative className="size-icon" />
          </RoundIconButton>
        ) : null}

        <span
          className={`text-caption ml-auto ${caracteres > LIMITE_DO_CORPO ? "text-error" : "text-inkMuted"}`}
        >
          {caracteres.toLocaleString("pt-BR")} de {LIMITE_DO_CORPO.toLocaleString("pt-BR")}
        </span>
      </div>

      {/*
        **Logo abaixo dos botões, não no fim do formulário.** `EscolherGif` é
        uma folha desenhada no fluxo, sem véu nem portal; aberta no fim de um
        formulário dentro de uma janela que rola, ela nasce abaixo da dobra —
        e para quem clica, o botão de GIF não faz nada.
      */}
      <EscolherGif
        aberto={escolhendoGif}
        onFechar={() => setEscolhendoGif(false)}
        onEscolher={(gif) => {
          acrescentarGif(gif);
          setEscolhendoGif(false);
        }}
      />

      {problemaDaCapa ? (
        <p role="alert" className="text-caption text-error">
          {problemaDaCapa}
        </p>
      ) : null}

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" type="button" onClick={onFechar}>
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={oQueFalta !== null || enviando}
          disabledHint={oQueFalta ?? undefined}
        >
          {enviando ? "Publicando…" : "Publicar"}
        </Button>
      </div>
    </form>
  );
}

/**
 * A barra de formatação.
 *
 * **Só o que o desenho sabe desenhar.** Cada botão daqui tem um caso no
 * `switch` de `documento.tsx`; um botão a mais aqui faria o texto sumir
 * depois de publicado. `design/components/post-formato.test.ts` compara as
 * duas listas e reprova se discordarem.
 */
function BarraDeFormato({ editor }: { editor: Editor }) {
  /*
   * Pelo mesmo motivo do contador: um `setState` por transação para acender
   * os botões remontaria o editor a cada tecla, e o texto se perderia.
   */
  const ativo = useEditorState({
    editor,
    selector: ({ editor: atual }) => ({
      bold: atual.isActive("bold"),
      italic: atual.isActive("italic"),
      heading: atual.isActive("heading"),
      bulletList: atual.isActive("bulletList"),
      orderedList: atual.isActive("orderedList"),
      blockquote: atual.isActive("blockquote"),
      link: atual.isActive("link"),
    }),
  });

  const ligado = "bg-ink text-paper";
  const desligado = "bg-surfacePage text-ink";

  const botao = (rotulo: string, ativo: boolean, aoClicar: () => void, conteudo: string) => (
    <button
      type="button"
      aria-label={rotulo}
      aria-pressed={ativo}
      onClick={aoClicar}
      className={`rounded-sm px-2 py-1 ${ativo ? ligado : desligado} text-caption cursor-pointer font-bold`}
    >
      {conteudo}
    </button>
  );

  return (
    <div role="toolbar" aria-label="Formatação do texto" className="flex flex-wrap gap-1">
      {botao("Negrito", ativo.bold, () => editor.chain().focus().toggleBold().run(), "B")}
      {botao("Itálico", ativo.italic, () => editor.chain().focus().toggleItalic().run(), "I")}
      {botao(
        "Subtítulo",
        ativo.heading,
        () => editor.chain().focus().toggleHeading({ level: 2 }).run(),
        "Subtítulo",
      )}
      {botao(
        "Lista com marcadores",
        ativo.bulletList,
        () => editor.chain().focus().toggleBulletList().run(),
        "Lista",
      )}
      {botao(
        "Lista numerada",
        ativo.orderedList,
        () => editor.chain().focus().toggleOrderedList().run(),
        "1. Lista",
      )}
      {botao(
        "Citação",
        ativo.blockquote,
        () => editor.chain().focus().toggleBlockquote().run(),
        "Citação",
      )}
      <BotaoDeLink editor={editor} />
    </div>
  );
}

/**
 * O link, que é o único com endereço a pedir.
 *
 * RN41: o corpo do post é o único texto do Hub que aceita endereços. O
 * servidor confere `http`/`https` de novo — aqui a conferência é para dar
 * a mensagem boa, não para garantir a regra.
 */
function BotaoDeLink({ editor }: { editor: Editor }) {
  const ativo = useEditorState({ editor, selector: ({ editor: e }) => e.isActive("link") });

  function alternar() {
    if (ativo) {
      editor.chain().focus().unsetLink().run();
      return;
    }

    const endereco = window.prompt("Endereço do link (começando com https://)");
    if (!endereco) return;
    if (!/^https?:\/\//i.test(endereco)) {
      window.alert("O link precisa começar com http:// ou https://");
      return;
    }
    editor.chain().focus().setLink({ href: endereco }).run();
  }

  return (
    <button
      type="button"
      aria-label={ativo ? "Tirar o link" : "Inserir link"}
      aria-pressed={ativo}
      onClick={alternar}
      className={`rounded-sm px-2 py-1 ${ativo ? "bg-ink text-paper" : "bg-surfacePage text-ink"} text-caption cursor-pointer font-bold`}
    >
      Link
    </button>
  );
}
