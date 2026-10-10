"use server";

/**
 * Ações dos tópicos (F08).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir, e o id de
 * quem pede vem da sessão, nunca do formulário.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createTopic, deleteTopic } from "@/lib/data/topics";
import { followTopic, unfollowTopic } from "@/lib/data/follows";
import { getViewer } from "@/lib/auth/session";
import { RuleViolationError, UnauthenticatedError } from "@/lib/data/errors";
import { createTopicSchema } from "@/lib/data/validation";
import { comunidadePorSlug } from "@/lib/data/comunidades";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDaCriacao = {
  erros?: Partial<Record<"name" | "description", string>>;
  erro?: string;
};

/**
 * Criar tópico (RN07, RN08).
 *
 * O limite de 1 por dia é do banco — índice único sobre o dia do ciclo. Aqui
 * a corrida vira mensagem: duas requisições ao mesmo tempo passariam por
 * qualquer checagem no app, e só o índice as separa.
 */
export async function criarTopico(
  _anterior: EstadoDaCriacao,
  formulario: FormData,
): Promise<EstadoDaCriacao> {
  const viewer = await quemPede();

  const comunidadeSlug = String(formulario.get("comunidade") ?? "");
  const comunidade = await comunidadePorSlug(comunidadeSlug);
  if (!comunidade) return { erro: "Comunidade não encontrada." };

  const validado = createTopicSchema.safeParse({
    communityId: comunidade.id,
    name: String(formulario.get("name") ?? ""),
    description: String(formulario.get("description") ?? ""),
    media: null,
  });

  if (!validado.success) {
    const erros: EstadoDaCriacao["erros"] = {};
    for (const problema of validado.error.issues) {
      const campo = problema.path[0];
      if (campo === "name" && !erros.name) erros.name = problema.message;
      if (campo === "description" && !erros.description) erros.description = problema.message;
    }
    return { erros };
  }

  let slug: string;
  try {
    const criado = await createTopic(viewer, validado.data);
    slug = criado!.slug;
  } catch (erro) {
    if (erro instanceof RuleViolationError && erro.rule === "RN07") {
      return {
        erro: "Você já criou um tópico nesta comunidade hoje. O próximo pode ser criado depois da virada das 00h.",
      };
    }
    throw erro;
  }

  revalidatePath(`/c/${comunidadeSlug}`);
  redirect(`/c/${comunidadeSlug}/${slug}`);
}

/** RN18: o olho. Seguir é sempre manual — responder não segue. */
export async function alternarSeguirTopico(topicId: string, seguindo: boolean, endereco: string) {
  const viewer = await quemPede();

  if (seguindo) {
    await unfollowTopic(viewer, topicId);
  } else {
    await followTopic(viewer, topicId);
  }

  revalidatePath(endereco);
}

/** RN08: apagar o próprio tópico, abaixo do limite de respostas de outros. */
export async function apagarTopico(topicId: string, comunidadeSlug: string) {
  const viewer = await quemPede();
  await deleteTopic(viewer, topicId);

  revalidatePath(`/c/${comunidadeSlug}`);
  redirect(`/c/${comunidadeSlug}`);
}
