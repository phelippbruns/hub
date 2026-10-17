"use server";

/**
 * Ações das respostas (F09).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir. A imagem
 * passa pela conferência de tipo e pela remoção da localização **aqui**, no
 * servidor — o navegador não tem caminho até o depósito.
 */
import { revalidatePath } from "next/cache";
import {
  comunidadesParaMarcar,
  createAnswer,
  deleteAnswer,
  pessoasParaMarcar,
  topicosParaMarcar,
} from "@/lib/data/topics";
import { getViewer } from "@/lib/auth/session";
import { UnauthenticatedError } from "@/lib/data/errors";
import { acharLink } from "@/lib/texto/links";
import type { TipoDeMarcacao } from "@/lib/texto/marcacoes";
import { ImagemRecusada, TAMANHO_MAXIMO, TAMANHO_MAXIMO_EM_MB } from "@/lib/midia/imagem";
import { guardarImagem } from "@/lib/midia/deposito";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDaResposta = {
  erro?: string;
  trechoProibido?: string;
  /**
   * Cresce a cada envio aceito. A tela limpa o campo quando este número
   * muda — e **só então**. Limpar no clique perderia o que a pessoa
   * escreveu quando o servidor recusa, que é justamente a hora em que ela
   * mais precisa do texto de volta.
   */
  enviadas?: number;
};

/** RN13: resposta de até 240 caracteres, com uma imagem. */
export async function responder(
  _anterior: EstadoDaResposta,
  formulario: FormData,
): Promise<EstadoDaResposta> {
  const viewer = await quemPede();

  const topicId = String(formulario.get("topicId") ?? "");
  const endereco = String(formulario.get("endereco") ?? "");
  const texto = String(formulario.get("text") ?? "").trim();

  if (texto.length > 240) return { erro: "A resposta passa de 240 caracteres." };

  /*
   * RN16: o aviso cita o trecho. "Links não são aceitos" num texto de 240
   * caracteres deixa a pessoa caçando o que fez de errado.
   */
  const link = acharLink(texto);
  if (link) {
    return {
      erro: "Links não são aceitos no Hub.",
      trechoProibido: link.trecho,
    };
  }

  /*
   * GIF e imagem são excludentes (RN13): um ou outro, nunca os dois. A tela
   * já impede, e aqui é a regra.
   */
  const gif = String(formulario.get("gif") ?? "").trim();
  const arquivo = formulario.get("imagem");
  const temArquivo = arquivo instanceof File && arquivo.size > 0;

  if (gif && temArquivo) return { erro: "Escolha uma imagem ou um GIF, não os dois." };

  /*
   * Decisão do PO: GIF ou imagem **sozinhos** já são resposta. Vazio dos dois
   * lados, não — senão um clique errado publica um cartão em branco.
   */
  if (!texto && !gif && !temArquivo) {
    return { erro: "Envie um texto, uma imagem ou um GIF." };
  }

  if (gif) {
    // O endereço vem do GIPHY, público por natureza — nada a guardar.
    if (!/^https:\/\/[a-z0-9.-]*giphy\.com\//i.test(gif)) {
      return { erro: "Esse GIF não veio do GIPHY." };
    }

    await createAnswer(viewer, {
      topicId,
      text: texto,
      media: { caminho: gif, kind: "gif" as const },
    });

    revalidatePath(endereco);
    return { enviadas: (_anterior.enviadas ?? 0) + 1 };
  }

  let caminho: string | null = null;

  if (temArquivo) {
    if (arquivo.size > TAMANHO_MAXIMO)
      return { erro: `A imagem passa de ${TAMANHO_MAXIMO_EM_MB} MB.` };

    try {
      caminho = await guardarImagem(new Uint8Array(await arquivo.arrayBuffer()), "respostas");
    } catch (erro) {
      if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
      throw erro;
    }
  }

  await createAnswer(viewer, {
    topicId,
    text: texto,
    media: caminho ? { caminho, kind: "image" as const } : null,
  });

  revalidatePath(endereco);
  return { enviadas: (_anterior.enviadas ?? 0) + 1 };
}

/** RN14: não há edição. Apagar e responder de novo é o caminho. */
export async function apagarResposta(answerId: string, endereco: string) {
  const viewer = await quemPede();
  await deleteAnswer(viewer, answerId);
  revalidatePath(endereco);
}

export type Sugestao = { valor: string; nome: string };

/**
 * O que sugerir enquanto a pessoa escreve a marcação.
 *
 * Cada sinal busca onde faz sentido:
 *
 * - `@` — **só membros daquela comunidade** (item 7 do escopo): marcar é
 *   convite, não intromissão, e sugerir alguém de fora seria oferecer um
 *   aviso que o servidor não vai mandar.
 * - `#` — comunidades do Hub inteiro: marcar comunidade é indicar.
 * - `*` — tópicos **da mesma comunidade**, porque o endereço de tópico é
 *   único por comunidade e um `*` de fora nunca viraria link.
 *
 * No servidor, e não filtrando no navegador: a lista não cabe na tela, e
 * filtrar o que veio é uma busca que mente — foi o que aconteceu com a
 * busca de pessoas da Cabine.
 */
export async function sugerirParaMarcar(
  topicId: string,
  tipo: TipoDeMarcacao,
  termo: string,
): Promise<Sugestao[]> {
  const viewer = await quemPede();

  if (tipo === "comunidade") {
    const achadas = await comunidadesParaMarcar(viewer, termo);
    return achadas.map((c) => ({ valor: c.slug, nome: c.nome }));
  }

  if (tipo === "topico") {
    const achados = await topicosParaMarcar(viewer, topicId, termo);
    return achados.map((t) => ({ valor: t.slug, nome: t.nome }));
  }

  const pessoas = await pessoasParaMarcar(viewer, topicId, termo);
  return pessoas.map((p) => ({ valor: p.handle, nome: p.nome }));
}
