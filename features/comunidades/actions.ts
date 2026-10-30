"use server";

/**
 * Ações das comunidades (F07).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir. O id de quem
 * pede vem sempre da sessão, nunca do formulário.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  comunidadeComOMesmoNome,
  createCommunity,
  joinCommunity,
  leaveCommunity,
} from "@/lib/data/communities";
import {
  CAPA_SEM_ENQUADRAMENTO,
  alternarFixada,
  comunidadePorSlug,
  trocarCapa,
  type EnquadramentoDaCapa,
} from "@/lib/data/comunidades";
import {
  ImagemRecusada,
  TAMANHO_MAXIMO,
  TAMANHO_MAXIMO_EM_MB,
  dimensoesDaImagem,
} from "@/lib/midia/imagem";
import {
  QUADRO_DA_CAPA,
  ancoraDoEnquadramento,
  dentroDoLimite,
  type Medidas,
} from "@/lib/midia/enquadramento";
import { apagarImagem, guardarImagem } from "@/lib/midia/deposito";
import { getViewer } from "@/lib/auth/session";
import { RuleViolationError, UnauthenticatedError } from "@/lib/data/errors";
import { createCommunitySchema } from "@/lib/data/validation";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDaCriacao = {
  erros?: Partial<Record<"name" | "intro" | "coverUrl", string>>;
  erro?: string;
  /** Quando o nome já existe, a saída que o produto oferece é entrar nela. */
  jaExiste?: { name: string; slug: string };
};

/**
 * Criar comunidade (RN03, RN04, RN06).
 *
 * A checagem de nome roda **no envio**, como a RN04 manda, e a mensagem
 * nomeia a comunidade existente: sem o nome, a pessoa não tem como aceitar o
 * convite de entrar nela.
 *
 * O índice único do banco continua sendo a garantia de verdade — duas
 * criações ao mesmo tempo passariam pela checagem e só o índice as separa.
 */
export async function criarComunidade(
  _anterior: EstadoDaCriacao,
  formulario: FormData,
): Promise<EstadoDaCriacao> {
  const viewer = await quemPede();

  /*
   * A capa é opcional: sem imagem, a comunidade nasce com a padrão, como
   * antes. Guardar **antes** de validar nome e intro desperdiçaria um
   * arquivo a cada nome repetido, então a imagem só sobe depois que o
   * resto passou.
   */
  const arquivo = formulario.get("imagem");
  const temCapa = arquivo instanceof File && arquivo.size > 0;

  if (temCapa && arquivo.size > TAMANHO_MAXIMO) {
    return { erro: `A imagem passa de ${TAMANHO_MAXIMO_EM_MB} MB.` };
  }

  // F12.1: não há Universo a escolher. A camada de dados põe no Hubverso.
  const entrada = {
    name: String(formulario.get("name") ?? ""),
    intro: String(formulario.get("intro") ?? ""),
    coverUrl: null,
  };

  const validado = createCommunitySchema.safeParse(entrada);
  if (!validado.success) {
    // Um erro por campo: o primeiro é o que a pessoa precisa ler.
    const erros: EstadoDaCriacao["erros"] = {};
    for (const problema of validado.error.issues) {
      const campo = problema.path[0];
      if (campo === "name" && !erros.name) erros.name = problema.message;
      if (campo === "intro" && !erros.intro) erros.intro = problema.message;
    }
    return { erros };
  }

  const existente = await comunidadeComOMesmoNome(validado.data.name);
  if (existente) return { jaExiste: { name: existente.name, slug: existente.slug } };

  let capa: string | null = null;
  let enquadramento = CAPA_SEM_ENQUADRAMENTO;
  if (temCapa) {
    const bytes = new Uint8Array(await arquivo.arrayBuffer());
    try {
      capa = await guardarImagem(bytes, "capas");
    } catch (erro) {
      if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
      throw erro;
    }
    enquadramento = enquadramentoDaCapa(formulario, dimensoesDaImagem(bytes));
  }

  let slug: string;
  try {
    const criada = await createCommunity(viewer, {
      ...validado.data,
      coverUrl: capa,
      ...enquadramento,
    });
    slug = criada!.slug;
  } catch (erro) {
    // A corrida: alguém criou o mesmo nome entre a checagem e o INSERT.
    if (erro instanceof RuleViolationError && erro.rule === "RN04") {
      const agora = await comunidadeComOMesmoNome(validado.data.name);
      return agora
        ? { jaExiste: { name: agora.name, slug: agora.slug } }
        : { erro: "Já existe uma comunidade com esse nome." };
    }
    throw erro;
  }

  revalidatePath("/comunidades/minhas");
  revalidatePath("/comunidades");
  redirect(`/c/${slug}`);
}

/** O # da página da comunidade: entra e sai. */
export async function alternarMembro(
  communityId: string,
  slug: string,
  souMembro: boolean,
): Promise<{ comunidadeApagada: boolean }> {
  const viewer = await quemPede();
  let apagada = false;

  if (souMembro) {
    // RN35: sair sendo a última pessoa apaga a comunidade.
    ({ comunidadeApagada: apagada } = await leaveCommunity(viewer, communityId));
  } else {
    await joinCommunity(viewer, communityId);
  }

  revalidatePath(`/c/${slug}`);
  revalidatePath("/comunidades/minhas");
  revalidatePath("/comunidades");
  return { comunidadeApagada: apagada };
}

/** Fixar e desafixar, na linha de Minhas Comunidades. */
export async function alternarComunidadeFixada(communityId: string, fixar: boolean) {
  const viewer = await quemPede();
  await alternarFixada(viewer, communityId, fixar);
  revalidatePath("/comunidades/minhas");
}

/**
 * O enquadramento que vem do formulário, reconferido com as medidas que o
 * servidor leu **dos bytes**.
 *
 * A tela manda deslocamento (`ox`, `oy`), que é o que ela sabe arrastar, e
 * o que se guarda é âncora, que é o que sobrevive à largura da janela
 * mudar. A conversão é aqui, num lugar só, porque as duas telas que enviam
 * capa precisam exatamente dela.
 *
 * Nada do formulário é confiável: `dentroDoLimite` corta o que passaria da
 * borda, e o que não for número vira o neutro do campo.
 */
function enquadramentoDaCapa(formulario: FormData, medidas: Medidas | null): EnquadramentoDaCapa {
  if (!medidas) return CAPA_SEM_ENQUADRAMENTO;

  const numero = (campo: string) => Number(formulario.get(campo));
  const pedido = dentroDoLimite(
    medidas,
    { zoom: numero("capaZoom"), ox: numero("capaOx"), oy: numero("capaOy") },
    QUADRO_DA_CAPA,
  );
  const ancora = ancoraDoEnquadramento(medidas, pedido, QUADRO_DA_CAPA);

  return {
    coverWidth: medidas.largura,
    coverHeight: medidas.altura,
    coverZoom: pedido.zoom,
    coverAnchorX: ancora.x,
    coverAnchorY: ancora.y,
  };
}

export type EstadoDaCapa = { erro?: string; trocada?: boolean };

/**
 * Trocar a capa da comunidade (RN03, RN06).
 *
 * A imagem passa pela conferência de tipo e pela remoção da localização
 * antes de entrar no depósito. Quem confere se a pessoa pode é
 * `trocarCapa`, na camada de dados.
 */
export async function trocarCapaDaComunidade(
  _anterior: EstadoDaCapa,
  formulario: FormData,
): Promise<EstadoDaCapa> {
  const viewer = await quemPede();

  const slug = String(formulario.get("comunidade") ?? "");
  const comunidade = await comunidadePorSlug(slug);
  if (!comunidade) return { erro: "Comunidade não encontrada." };

  const arquivo = formulario.get("imagem");
  if (!(arquivo instanceof File) || arquivo.size === 0) {
    return { erro: "Escolha uma imagem." };
  }
  if (arquivo.size > TAMANHO_MAXIMO)
    return { erro: `A imagem passa de ${TAMANHO_MAXIMO_EM_MB} MB.` };

  const bytes = new Uint8Array(await arquivo.arrayBuffer());

  let caminho: string;
  try {
    caminho = await guardarImagem(bytes, "capas");
  } catch (erro) {
    if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
    throw erro;
  }

  const { anteriorParaApagar } = await trocarCapa(
    viewer,
    comunidade.id,
    caminho,
    // Medidas dos bytes, nunca do formulário: é o que impede alguém de
    // mandar um tamanho mentiroso e deslocar a capa para fora do quadro.
    enquadramentoDaCapa(formulario, dimensoesDaImagem(bytes)),
  );
  await apagarImagem(anteriorParaApagar);

  for (const rota of [`/c/${slug}`, "/comunidades/minhas", "/comunidades"]) {
    revalidatePath(rota);
  }
  return { trocada: true };
}
