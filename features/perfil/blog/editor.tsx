"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Input, Janela, RoundIconButton, TextField } from "@/design/components";
import { GifIcon, ImageIcon, SetaBaixoIcon, SetaCimaIcon, CloseIcon } from "@/design/icons";
import { EscolherGif, type GifEscolhido } from "@/design/components";
import { problemaNaImagem } from "@/lib/midia/limites";
import { enderecoDoPost } from "@/lib/rotas";
import { LIMITE_DO_CORPO, LIMITE_DO_SUBTITULO, LIMITE_DO_TITULO, MAXIMO_DE_BLOCOS } from "./shared";
import { salvarPost, type EstadoDoEditor } from "./actions";

/**
 * O editor de post: **blocos, não texto rico**.
 *
 * Decisão do PO em 12 de novembro de 2026, com o Tiptap registrado como
 * dívida. Uma caixa por parágrafo, e botões para acrescentar subtítulo,
 * imagem ou GIF. Fica sem negrito, itálico, lista, citação e link.
 *
 * **O que isso compra:** nenhuma dependência nova, nenhuma superfície de
 * sanitização, e — o que mais importa — **o endereço de cada imagem é
 * construído pelo servidor**. O navegador manda o índice do arquivo, não
 * um caminho. Com um editor de texto rico o documento viria pronto do
 * navegador, e um nó de imagem forjado seria buscado pelo navegador de
 * todo mundo que lesse o post.
 *
 * **O que isso custa, e por que a dívida é barata:** o formato guardado é
 * o mesmo que o editor completo produziria, e o renderizador já sabe
 * desenhar o que falta. Ligar o Tiptap depois é acrescentar uma superfície
 * de escrita — sem migração e sem mexer no desenho.
 */

type Bloco =
  | { id: number; tipo: "paragrafo"; texto: string }
  | { id: number; tipo: "subtitulo"; texto: string }
  | { id: number; tipo: "imagem"; arquivo: File | null }
  | { id: number; tipo: "gif"; gif: GifEscolhido };

let proximoId = 0;
const novoId = () => (proximoId += 1);

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
        <Formulario handle={handle} base={base} gifLigado={gifLigado} onFechar={onFechar} />
      ) : null}
    </Janela>
  );
}

function Formulario({
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
  const [blocos, setBlocos] = useState<Bloco[]>([{ id: novoId(), tipo: "paragrafo", texto: "" }]);
  const [escolhendoGif, setEscolhendoGif] = useState(false);
  const [estado, enviar, enviando] = useActionState<EstadoDoEditor, FormData>(salvarPost, {});
  const formulario = useRef<HTMLFormElement>(null);

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

  const caracteres = blocos
    .filter((b) => b.tipo === "paragrafo" || b.tipo === "subtitulo")
    .reduce((total, b) => total + (b as { texto: string }).texto.length, 0);

  const semTexto = !blocos.some((b) => b.tipo === "paragrafo" && b.texto.trim().length > 0);
  const imagemVazia = blocos.some((b) => b.tipo === "imagem" && b.arquivo === null);
  const problemaDaCapa = capa ? problemaNaImagem(capa) : null;

  const oQueFalta = problemaDaCapa
    ? problemaDaCapa
    : titulo.trim().length === 0
      ? "Dê um título ao post."
      : semTexto
        ? "Escreva ao menos um parágrafo."
        : imagemVazia
          ? "Escolha o arquivo da imagem, ou tire o bloco."
          : caracteres > LIMITE_DO_CORPO
            ? `O texto passa de ${LIMITE_DO_CORPO.toLocaleString("pt-BR")} caracteres.`
            : null;

  function trocar(id: number, mudanca: Partial<Bloco>) {
    setBlocos((atuais) => atuais.map((b) => (b.id === id ? ({ ...b, ...mudanca } as Bloco) : b)));
  }

  function acrescentar(bloco: Bloco) {
    setBlocos((atuais) => (atuais.length >= MAXIMO_DE_BLOCOS ? atuais : [...atuais, bloco]));
  }

  function mover(id: number, direcao: -1 | 1) {
    setBlocos((atuais) => {
      const i = atuais.findIndex((b) => b.id === id);
      const j = i + direcao;
      if (i < 0 || j < 0 || j >= atuais.length) return atuais;
      /*
       * `splice` e não troca por índice: o lint do Hub barra indexar por
       * variável, e com razão em geral. Tirar e reinserir diz a mesma
       * coisa sem indexar.
       */
      const copia = [...atuais];
      const [movido] = copia.splice(i, 1);
      if (!movido) return atuais;
      copia.splice(j, 0, movido);
      return copia;
    });
  }

  /**
   * O que o servidor recebe: a **estrutura**, nunca o documento pronto.
   *
   * Bloco de imagem leva o índice do arquivo no formulário, e os arquivos
   * vão em campos próprios. Quem decide o `src` é o depósito.
   */
  function aoEnviar(dados: FormData) {
    let indice = 0;
    const estrutura = blocos
      .map((bloco) => {
        if (bloco.tipo === "paragrafo" || bloco.tipo === "subtitulo") {
          const texto = bloco.texto.trim();
          return texto ? { tipo: bloco.tipo, texto } : null;
        }
        if (bloco.tipo === "gif") {
          return {
            tipo: "gif" as const,
            url: bloco.gif.url,
            largura: bloco.gif.largura,
            altura: bloco.gif.altura,
          };
        }
        if (!bloco.arquivo) return null;
        dados.set(`imagem${indice}`, bloco.arquivo);
        return { tipo: "imagem" as const, arquivo: indice++ };
      })
      .filter((b) => b !== null);

    dados.set("blocos", JSON.stringify(estrutura));
    dados.set("handle", handle);
    if (capa) dados.set("capa", capa);
    enviar(dados);
  }

  return (
    <form ref={formulario} action={aoEnviar} className="flex flex-col gap-3">
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

      <div className="flex flex-col gap-2">
        {blocos.map((bloco, i) => (
          <div key={bloco.id} className="bg-surfacePage flex flex-col gap-1 rounded-sm p-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-caption text-inkMuted font-bold">
                {bloco.tipo === "paragrafo"
                  ? "Parágrafo"
                  : bloco.tipo === "subtitulo"
                    ? "Subtítulo"
                    : bloco.tipo === "imagem"
                      ? "Imagem"
                      : "GIF"}
              </span>
              <span className="flex gap-1">
                <RoundIconButton
                  label={`Mover o bloco ${i + 1} para cima`}
                  tamanho="sm"
                  nu
                  disabled={i === 0}
                  disabledHint="Já é o primeiro"
                  onClick={() => mover(bloco.id, -1)}
                >
                  <SetaCimaIcon decorative className="size-iconSm" />
                </RoundIconButton>
                <RoundIconButton
                  label={`Mover o bloco ${i + 1} para baixo`}
                  tamanho="sm"
                  nu
                  disabled={i === blocos.length - 1}
                  disabledHint="Já é o último"
                  onClick={() => mover(bloco.id, 1)}
                >
                  <SetaBaixoIcon decorative className="size-iconSm" />
                </RoundIconButton>
                <RoundIconButton
                  label={`Tirar o bloco ${i + 1}`}
                  tamanho="sm"
                  nu
                  disabled={blocos.length === 1}
                  disabledHint="O post precisa de um bloco"
                  onClick={() => setBlocos((atuais) => atuais.filter((b) => b.id !== bloco.id))}
                >
                  <CloseIcon decorative className="size-iconSm" />
                </RoundIconButton>
              </span>
            </div>

            {bloco.tipo === "paragrafo" ? (
              <TextField
                label={`Parágrafo ${i + 1}`}
                /* O contador do campo seria um por bloco; o que importa é
                   o do post inteiro, logo abaixo dos botões. */
                maxLength={LIMITE_DO_CORPO}
                value={bloco.texto}
                onValueChange={(texto) => trocar(bloco.id, { texto })}
                rows={4}
                placeholder="Escreva aqui."
              />
            ) : null}

            {bloco.tipo === "subtitulo" ? (
              <Input
                label={`Subtítulo ${i + 1}`}
                rotuloOculto
                value={bloco.texto}
                onChange={(evento) => trocar(bloco.id, { texto: evento.target.value })}
                maxLength={LIMITE_DO_SUBTITULO}
                placeholder="O que funcionou"
              />
            ) : null}

            {bloco.tipo === "imagem" ? (
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label={`Arquivo da imagem ${i + 1}`}
                onChange={(evento) =>
                  trocar(bloco.id, { arquivo: evento.target.files?.[0] ?? null })
                }
                className="text-caption text-inkMuted"
              />
            ) : null}

            {bloco.tipo === "gif" ? (
              // eslint-disable-next-line @next/next/no-img-element -- endereço do GIPHY
              <img src={bloco.gif.url} alt="" className="h-avatarLg w-auto rounded-sm" />
            ) : null}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => acrescentar({ id: novoId(), tipo: "paragrafo", texto: "" })}
        >
          + Parágrafo
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => acrescentar({ id: novoId(), tipo: "subtitulo", texto: "" })}
        >
          + Subtítulo
        </Button>
        <Button
          variant="secondary"
          size="sm"
          type="button"
          onClick={() => acrescentar({ id: novoId(), tipo: "imagem", arquivo: null })}
        >
          <ImageIcon decorative className="size-iconSm" />
          Imagem
        </Button>
        {gifLigado ? (
          <Button
            variant="secondary"
            size="sm"
            type="button"
            onClick={() => setEscolhendoGif(true)}
          >
            <GifIcon decorative className="size-iconSm" />
            GIF
          </Button>
        ) : null}

        <span
          className={`text-caption ml-auto ${caracteres > LIMITE_DO_CORPO ? "text-error" : "text-inkMuted"}`}
        >
          {caracteres.toLocaleString("pt-BR")} de {LIMITE_DO_CORPO.toLocaleString("pt-BR")}
        </span>
      </div>

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

      <EscolherGif
        aberto={escolhendoGif}
        onFechar={() => setEscolhendoGif(false)}
        onEscolher={(gif) => {
          acrescentar({ id: novoId(), tipo: "gif", gif });
          setEscolhendoGif(false);
        }}
      />
    </form>
  );
}
