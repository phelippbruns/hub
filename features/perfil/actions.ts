"use server";

/**
 * Ações do perfil (F12).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir, e o id de
 * quem pede vem da sessão.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ZodError } from "zod";
import { getViewer } from "@/lib/auth/session";
import { RuleViolationError, UnauthenticatedError } from "@/lib/data/errors";
import { followProfile, unfollowProfile } from "@/lib/data/follows";
import { bloquear, desbloquear, dessilenciar, silenciar } from "@/lib/data/perfil";
import { guardarMedidasDaFoto, medidasDaFotoAtual, updateProfile } from "@/lib/data/profiles";
import { MAXIMO_DE_LINKS } from "@/lib/data/validation";
import { acharLink } from "@/lib/texto/links";
import {
  ImagemRecusada,
  TAMANHO_MAXIMO,
  TAMANHO_MAXIMO_EM_MB,
  dimensoesDaImagem,
} from "@/lib/midia/imagem";
import { ENQUADRAMENTO_PADRAO, dentroDoLimite } from "@/lib/midia/enquadramento";
import { guardarImagem } from "@/lib/midia/deposito";
import { FUNDO_PADRAO } from "./fundos";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

/** Todas as telas que mostram este perfil mudam junto. */
function atualizarTelas(handle: string) {
  revalidatePath(`/${handle}`);
  revalidatePath("/perfil");
  revalidatePath("/perfil/seguindo");
  revalidatePath("/inicio");
}

/** RN18: o olho de seguir pessoas. */
export async function alternarSeguir(profileId: string, handle: string, seguindo: boolean) {
  const viewer = await quemPede();

  if (seguindo) {
    await unfollowProfile(viewer, profileId);
  } else {
    await followProfile(viewer, profileId);
  }

  atualizarTelas(handle);
}

/** RN26: bloquear esconde nos dois sentidos e desfaz o seguir. */
export async function alternarBloqueio(profileId: string, handle: string, bloqueado: boolean) {
  const viewer = await quemPede();

  if (bloqueado) {
    await desbloquear(viewer, profileId);
  } else {
    await bloquear(viewer, profileId);
  }

  atualizarTelas(handle);
}

/** Silenciar: some do meu Início, e nada mais. */
export async function alternarSilencio(profileId: string, handle: string, silenciado: boolean) {
  const viewer = await quemPede();

  if (silenciado) {
    await dessilenciar(viewer, profileId);
  } else {
    await silenciar(viewer, profileId);
  }

  atualizarTelas(handle);
}

export type EstadoDoPerfil = {
  erros?: Partial<Record<"name" | "handle" | "bio" | "foto" | "links", string>>;
  erro?: string;
  salvo?: boolean;
};

/**
 * Salvar o perfil (RN17, RN27).
 *
 * A foto só é tocada quando uma nova é enviada: salvar o nome não pode
 * apagar a foto.
 */
export async function salvarPerfil(
  _anterior: EstadoDoPerfil,
  formulario: FormData,
): Promise<EstadoDoPerfil> {
  const viewer = await quemPede();

  const nome = String(formulario.get("name") ?? "").trim();
  const handle = String(formulario.get("handle") ?? "").trim();
  const bio = String(formulario.get("bio") ?? "").trim();

  if (!nome) return { erros: { name: "Informe seu nome" } };

  // RN16: o aviso cita o trecho, como no campo de resposta.
  const link = bio ? acharLink(bio) : null;
  if (link) return { erros: { bio: `Tire o endereço: "${link.trecho}"` } };

  let avatarCaminho: string | undefined;
  let medidas: { largura: number; altura: number } | null = null;
  const arquivo = formulario.get("foto");

  if (arquivo instanceof File && arquivo.size > 0) {
    if (arquivo.size > TAMANHO_MAXIMO) {
      return { erros: { foto: mensagemDeTamanho(arquivo.size) } };
    }

    try {
      const bytes = new Uint8Array(await arquivo.arrayBuffer());
      /*
       * RN30: as medidas saem dos bytes, **nunca do formulário**. Elas são
       * o que limita o enquadramento, e aceitá-las de quem envia seria
       * deixar a conferência nas mãos de quem ela deveria limitar.
       */
      medidas = dimensoesDaImagem(bytes);
      avatarCaminho = await guardarImagem(bytes, "perfis");
    } catch (erro) {
      if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
      throw erro;
    }
  }

  /*
   * RN27: a lista de links chega inteira. Linha sem título e sem endereço é
   * linha em branco do formulário, não um link que a pessoa quis apagar
   * pela metade — essas somem antes da validação.
   */
  const links: { title: string; url: string }[] = [];
  for (let i = 0; i < MAXIMO_DE_LINKS; i += 1) {
    const title = String(formulario.get(`linkTitulo${i}`) ?? "").trim();
    const url = String(formulario.get(`linkEndereco${i}`) ?? "").trim();
    if (!title && !url) continue;
    if (!title) return { erros: { links: "Dê um título ao link." } };
    if (!url) return { erros: { links: `Falta o endereço de "${title}".` } };
    links.push({ title, url });
  }

  /*
   * RN30: o enquadramento vem do formulário, e por isso é conferido contra
   * as medidas reais — as da foto nova, ou as que já estavam guardadas.
   * Fora do limite não é erro para mostrar: é trazido para a borda, que é
   * o que a tela já fazia enquanto a pessoa arrastava.
   */
  const guardadas = medidas ?? (await medidasDaFotoAtual(viewer));
  const pedido = {
    zoom: Number(formulario.get("zoom") ?? 1),
    ox: Number(formulario.get("ox") ?? 0),
    oy: Number(formulario.get("oy") ?? 0),
  };
  const enquadramento = guardadas ? dentroDoLimite(guardadas, pedido) : ENQUADRAMENTO_PADRAO;

  try {
    await updateProfile(viewer, {
      name: nome,
      handle,
      bio: bio || null,
      links,
      backgroundKey: String(formulario.get("fundo") ?? FUNDO_PADRAO),
      hideFollowers: formulario.get("esconderSeguidores") === "sim",
      enquadramento,
      ...(avatarCaminho ? { avatarCaminho } : {}),
    });

    // As medidas acompanham a foto, e só mudam quando ela muda.
    if (avatarCaminho) await guardarMedidasDaFoto(viewer, medidas);
  } catch (erro) {
    if (erro instanceof ZodError) {
      return { erros: { links: primeiroProblema(erro) } };
    }
    if (erro instanceof RuleViolationError) {
      return { erros: erro.rule === "RN17" ? { handle: erro.message } : { bio: erro.message } };
    }
    if (erro instanceof Error && /handle|@/i.test(erro.message)) {
      return { erros: { handle: "Esse @ não é válido. Use de 2 a 20 letras, números ou _" } };
    }
    throw erro;
  }

  atualizarTelas(handle);
  redirect("/perfil");
}

/**
 * O tamanho do arquivo e o limite, nas duas pontas da frase.
 *
 * Dizer só "passou do limite" obriga a pessoa a adivinhar o quanto: com os
 * dois números ela sabe se precisa de outra foto ou se basta recortar.
 */
function mensagemDeTamanho(bytes: number): string {
  const mb = (bytes / 1024 / 1024).toFixed(1).replace(".", ",");
  return `Essa imagem tem ${mb} MB. Envie uma com até ${TAMANHO_MAXIMO_EM_MB} MB.`;
}

/** A primeira reclamação do Zod, em português, para a tela mostrar. */
function primeiroProblema(erro: ZodError): string {
  return erro.issues[0]?.message ?? "Confira os links.";
}
