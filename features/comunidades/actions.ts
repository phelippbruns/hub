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
import { ZodError } from "zod";
import {
  CAPA_SEM_ENQUADRAMENTO,
  alternarFixada,
  editarComunidade,
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
import { ZOOM_MAXIMO, ZOOM_MINIMO, ancoraValida, type Medidas } from "@/lib/midia/enquadramento";
import { apagarImagem, guardarImagem } from "@/lib/midia/deposito";
import { getViewer } from "@/lib/auth/session";
import {
  ForbiddenError,
  NotFoundError,
  RuleViolationError,
  UnauthenticatedError,
} from "@/lib/data/errors";
import { followProfile, unfollowProfile } from "@/lib/data/follows";
import { convidarModerador, removerModerador } from "@/lib/data/moderacao";
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
 * O enquadramento que vem do formulário.
 *
 * A tela manda **âncora e zoom**, não deslocamento. Até 7 de novembro de
 * 2026 ela mandava `ox`/`oy` e este lugar os convertia em âncora usando
 * `QUADRO_DA_CAPA`, 7 por 1 — uma forma que nenhuma capa tem: a capa tem
 * altura fixa e largura de janela, e dá 4,92 por 1 em 1280. A prévia
 * desenhava a imagem 1,42 vez mais alta do que a capa publicava, e quem
 * centrava um rosto no ajuste via a capa publicar outro recorte.
 *
 * Deslocamento é fração de um quadro, e **só a tela sabe a forma dele**.
 * Âncora não fala de quadro: ela diz que ponto da foto fica em que ponto
 * da capa. Por isso ela atravessa a rede, e por isso a conferência aqui é
 * um limite a 0..1 — com `object-fit: cover` e a mesma origem no zoom,
 * nenhum valor nessa faixa deixa buraco.
 *
 * As medidas continuam vindo **dos bytes**, nunca do formulário.
 */
function enquadramentoDaCapa(formulario: FormData, medidas: Medidas | null): EnquadramentoDaCapa {
  if (!medidas) return CAPA_SEM_ENQUADRAMENTO;

  const zoom = Math.min(
    ZOOM_MAXIMO,
    Math.max(ZOOM_MINIMO, Number(formulario.get("capaZoom")) || ZOOM_MINIMO),
  );
  const ancora = ancoraValida(formulario.get("capaAncoraX"), formulario.get("capaAncoraY"));

  return {
    coverWidth: medidas.largura,
    coverHeight: medidas.altura,
    coverZoom: zoom,
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

/**
 * RN18: seguir uma pessoa a partir da lista de membros.
 *
 * A mesma ação que o perfil tem, repetida aqui porque uma feature não
 * importa de outra — o que é compartilhado sobe para `lib/data/`, e é onde
 * `followProfile` mora. O que muda é só qual tela revalidar.
 */
export async function alternarSeguirMembro(profileId: string, slug: string, seguindo: boolean) {
  const viewer = await quemPede();

  if (seguindo) {
    await unfollowProfile(viewer, profileId);
  } else {
    await followProfile(viewer, profileId);
  }

  revalidatePath(`/c/${slug}`);
}

/**
 * RN06: a moderação se oferece, não se impõe.
 *
 * O botão na lista de membros **manda um convite**; a pessoa só vira
 * moderadora quando aceita. Promover direto faria alguém acordar
 * responsável por uma comunidade sem ter dito sim, e moderar é trabalho.
 */
export async function convidarParaModerar(
  communityId: string,
  slug: string,
  profileId: string,
): Promise<{ erro?: string; convidado?: boolean }> {
  const viewer = await quemPede();

  try {
    await convidarModerador(viewer, communityId, profileId);
  } catch (erro) {
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath(`/c/${slug}`);
  return { convidado: true };
}

/**
 * RN33: tirar da moderação, pela aba Membros.
 *
 * A ação já existia, e só em `/c/<comunidade>/moderar`. O protótipo a põe
 * junto de "Convidar para moderar", que é onde se olha para decidir: ver
 * quem modera numa tela e tirar a moderação em outra obriga a guardar a
 * lista de cabeça.
 *
 * Quem criou a comunidade continua protegido — a recusa vem de
 * `removerModerador`, não daqui.
 */
export async function tirarDaModeracao(
  communityId: string,
  slug: string,
  profileId: string,
): Promise<{ erro?: string; removido?: boolean }> {
  const viewer = await quemPede();

  try {
    await removerModerador(viewer, communityId, profileId);
  } catch (erro) {
    if (erro instanceof ForbiddenError || erro instanceof NotFoundError) {
      return { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath(`/c/${slug}`);
  return { removido: true };
}

/**
 * RN06: quem modera muda nome, descrição curta, Sobre e regras.
 *
 * O endereço não muda junto com o nome — ele já foi compartilhado.
 */
export type EstadoDaEdicao = {
  erro?: string;
  salva?: boolean;
};

export async function editarComunidadeDaTela(
  _anterior: EstadoDaEdicao,
  formulario: FormData,
): Promise<EstadoDaEdicao> {
  const viewer = await quemPede();

  const slug = String(formulario.get("comunidade") ?? "");
  const communityId = String(formulario.get("communityId") ?? "");

  try {
    await editarComunidade(viewer, communityId, {
      name: String(formulario.get("name") ?? ""),
      intro: String(formulario.get("intro") ?? ""),
      about: String(formulario.get("about") ?? ""),
      rules: String(formulario.get("rules") ?? ""),
    });
  } catch (erro) {
    if (erro instanceof ZodError) {
      return { erro: erro.issues.at(0)?.message ?? "Confira os campos da comunidade." };
    }
    if (
      erro instanceof ForbiddenError ||
      erro instanceof NotFoundError ||
      erro instanceof RuleViolationError
    ) {
      return { erro: erro.message };
    }
    throw erro;
  }

  revalidatePath(`/c/${slug}`);
  return { salva: true };
}
