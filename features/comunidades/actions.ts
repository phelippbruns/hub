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
import { alternarFixada, definirPainelOculto } from "@/lib/data/comunidades";
import { getViewer } from "@/lib/auth/session";
import { RuleViolationError, UnauthenticatedError } from "@/lib/data/errors";
import { createCommunitySchema } from "@/lib/data/validation";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDaCriacao = {
  erros?: Partial<Record<"name" | "intro" | "universeId" | "coverUrl", string>>;
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

  const entrada = {
    universeId: String(formulario.get("universeId") ?? ""),
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
      if (campo === "universeId" && !erros.universeId) erros.universeId = problema.message;
    }
    return { erros };
  }

  const existente = await comunidadeComOMesmoNome(validado.data.name);
  if (existente) return { jaExiste: { name: existente.name, slug: existente.slug } };

  let slug: string;
  try {
    const criada = await createCommunity(viewer, validado.data);
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
export async function alternarMembro(communityId: string, slug: string, souMembro: boolean) {
  const viewer = await quemPede();

  if (souMembro) {
    await leaveCommunity(viewer, communityId);
  } else {
    await joinCommunity(viewer, communityId);
  }

  revalidatePath(`/c/${slug}`);
  revalidatePath("/comunidades/minhas");
}

/** Fixar e desafixar, na linha de Minhas Comunidades. */
export async function alternarComunidadeFixada(communityId: string, fixar: boolean) {
  const viewer = await quemPede();
  await alternarFixada(viewer, communityId, fixar);
  revalidatePath("/comunidades/minhas");
}

/** Ocultar e trazer de volta o painel, pelo menu de três pontos. */
export async function alternarPainel(oculto: boolean) {
  const viewer = await quemPede();
  await definirPainelOculto(viewer, oculto);
  revalidatePath("/c/[comunidade]", "layout");
}
