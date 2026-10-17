"use server";

/**
 * Ações da Cabine (F13).
 *
 * Regra de segurança 5: cada uma confere a sessão antes de agir, e o id de
 * quem pede vem da sessão, nunca do formulário.
 *
 * Enviar mensagem continua sendo Server Action mesmo com o Realtime ligado.
 * O Realtime é só o caminho de **volta**: a mensagem nasce aqui, depois de
 * passar pela validação, pelo bloqueio de links (RN16) e pela limpeza da
 * imagem. Deixar o navegador escrever direto na tabela contornaria os três.
 */
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { RuleViolationError, UnauthenticatedError } from "@/lib/data/errors";
import {
  abrirCabine,
  abrirConversaDireta,
  acceptInvite,
  cancelarConvite,
  declineInvite,
  inviteToCabin,
  leaveCabin,
  marcarCabineComoLida,
  sendMessage,
  pessoasParaConversar,
  sugestoesParaConvidar,
} from "@/lib/data/cabins";
import { blockProfile } from "@/lib/data/cabins";
import { definirQuemPodeConvidar } from "@/lib/data/profiles";
import { acharLink } from "@/lib/texto/links";
import { ImagemRecusada, TAMANHO_MAXIMO, TAMANHO_MAXIMO_EM_MB } from "@/lib/midia/imagem";
import { guardarImagem } from "@/lib/midia/deposito";
import { LIMITE_DA_MENSAGEM, MAXIMO_DE_CONVIDADOS } from "./shared";

async function quemPede() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer;
}

export type EstadoDoConvite = { erro?: string; trechoProibido?: string };

export type PessoaEncontrada = {
  id: string;
  nome: string;
  handle: string;
  emComum: string[];
  /** Vocês se seguem: a conversa com esta pessoa começa sem convite. */
  seSegue: boolean;
};

/**
 * Procura quem convidar, **no servidor**.
 *
 * A tela mostra as primeiras pessoas por ordem alfabética, e filtrar só
 * essas no navegador parecia suficiente enquanto o Hub tinha pouca gente.
 * Com a lista cheia, procurar alguém que não está nas primeiras não
 * encontrava nada — o campo de busca existia e não buscava.
 */
export async function procurarParaConvidar(termo: string): Promise<PessoaEncontrada[]> {
  const viewer = await quemPede();
  const achadas = await sugestoesParaConvidar(viewer, termo);

  return achadas.map((pessoa) => ({
    id: pessoa.id,
    nome: pessoa.nome,
    handle: pessoa.handle,
    emComum: pessoa.emComum,
    seSegue: pessoa.seSegue,
  }));
}

/**
 * RN20, RN21, RN22: convida até 4 pessoas de uma vez.
 *
 * Cada uma recebe um convite para a **mesma** Cabine: a primeira cria, as
 * outras entram na que foi criada. Convidar quatro e criar quatro conversas
 * separadas seria outra coisa.
 */
export async function convidarParaCabine(
  _anterior: EstadoDoConvite,
  formulario: FormData,
): Promise<EstadoDoConvite> {
  const viewer = await quemPede();

  const pessoas = formulario.getAll("pessoas").map(String).filter(Boolean);
  const mensagem = String(formulario.get("mensagem") ?? "").trim();
  /*
   * Convidar para uma Cabine que já existe, vindo do menu dela. Sem isto,
   * "Convidar pessoas" criaria uma conversa nova em vez de trazer alguém
   * para esta — que é o oposto do que o botão promete.
   */
  const cabineExistente = String(formulario.get("cabine") ?? "").trim();

  if (pessoas.length === 0) return { erro: "Escolha ao menos uma pessoa." };
  if (pessoas.length > MAXIMO_DE_CONVIDADOS) {
    return { erro: `A Cabine é de no máximo ${MAXIMO_DE_CONVIDADOS + 1} pessoas, contando você.` };
  }
  if (mensagem.length > LIMITE_DA_MENSAGEM) {
    return { erro: `A mensagem passa de ${LIMITE_DA_MENSAGEM} caracteres.` };
  }

  // RN16: o aviso cita o trecho, como no campo de resposta.
  const link = mensagem ? acharLink(mensagem) : null;
  if (link) {
    return { erro: "Links não são aceitos no Hub.", trechoProibido: link.trecho };
  }

  let destino = "/cabines";

  try {
    if (cabineExistente) {
      // Trazer gente para uma Cabine que já existe é sempre convite: as
      // outras pessoas de lá não escolheram quem você segue.
      for (const inviteeId of pessoas) {
        await inviteToCabin(viewer, {
          inviteeId,
          cabinId: cabineExistente,
          message: mensagem || null,
        });
      }
      destino = `/cabines/${cabineExistente}`;
    } else {
      // Quem se segue entra na hora; quem não, recebe convite. A conversa
      // que já começou abre direto — esperar numa lista o que já está
      // valendo seria um passo a toa.
      const { cabinId, jaComecou } = await abrirCabine(viewer, pessoas, mensagem || null);
      destino = jaComecou ? `/cabines/${cabinId}` : "/cabines";
    }
  } catch (erro) {
    if (erro instanceof RuleViolationError) return { erro: erro.message };
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  revalidatePath("/cabines");
  redirect(destino);
}

/** RN20: aceitar é o que faz a Cabine começar. */
export async function aceitarConvite(inviteId: string) {
  const viewer = await quemPede();
  const membro = await acceptInvite(viewer, inviteId);

  revalidatePath("/cabines");
  redirect(`/cabines/${membro!.cabinId}`);
}

/** RN22: a recusa é silenciosa. */
export async function recusarConvite(inviteId: string) {
  const viewer = await quemPede();
  await declineInvite(viewer, inviteId);

  revalidatePath("/cabines");
  redirect("/cabines");
}

/** RN22: quem convidou cancela enquanto o convite está aberto. */
export async function cancelarMeuConvite(inviteId: string) {
  const viewer = await quemPede();
  await cancelarConvite(viewer, inviteId);
  revalidatePath("/cabines");
}

/** RN24: com uma pessoa restante, a Cabine encerra. */
export async function sairDaCabine(cabinId: string) {
  const viewer = await quemPede();
  await leaveCabin(viewer, cabinId);

  revalidatePath("/cabines");
  redirect("/cabines");
}

/** RN26: bloquear tira das Cabines em comum, sem aviso. */
export async function bloquearDaCabine(profileId: string) {
  const viewer = await quemPede();
  await blockProfile(viewer, profileId);

  revalidatePath("/cabines");
  redirect("/cabines");
}

export type EstadoDaMensagem = {
  erro?: string;
  trechoProibido?: string;
  /** Cresce a cada envio aceito, para a tela limpar o campo só então. */
  enviadas?: number;
};

/** RN25: GIF ou 1 imagem por mensagem, nunca os dois. */
export async function enviarMensagem(
  _anterior: EstadoDaMensagem,
  formulario: FormData,
): Promise<EstadoDaMensagem> {
  const viewer = await quemPede();

  const cabinId = String(formulario.get("cabinId") ?? "");
  const texto = String(formulario.get("texto") ?? "").trim();

  if (texto.length > LIMITE_DA_MENSAGEM) {
    return { erro: `A mensagem passa de ${LIMITE_DA_MENSAGEM} caracteres.` };
  }

  const link = acharLink(texto);
  if (link) {
    return { erro: "Links não são aceitos no Hub.", trechoProibido: link.trecho };
  }

  const gif = String(formulario.get("gif") ?? "").trim();
  const arquivo = formulario.get("imagem");
  const temArquivo = arquivo instanceof File && arquivo.size > 0;

  if (gif && temArquivo) return { erro: "Escolha uma imagem ou um GIF, não os dois." };
  if (!texto && !gif && !temArquivo) {
    return { erro: "Escreva algo, ou escolha uma imagem ou um GIF." };
  }

  let media: { caminho: string; kind: "image" | "gif" } | null = null;

  if (gif) {
    if (!/^https:\/\/[a-z0-9.-]*giphy\.com\//i.test(gif)) {
      return { erro: "Esse GIF não veio do GIPHY." };
    }
    media = { caminho: gif, kind: "gif" };
  } else if (temArquivo) {
    if (arquivo.size > TAMANHO_MAXIMO) {
      return { erro: `A imagem passa de ${TAMANHO_MAXIMO_EM_MB} MB.` };
    }
    try {
      const caminho = await guardarImagem(new Uint8Array(await arquivo.arrayBuffer()), "respostas");
      media = { caminho, kind: "image" };
    } catch (erro) {
      if (erro instanceof ImagemRecusada) return { erro: erro.motivo };
      throw erro;
    }
  }

  try {
    await sendMessage(viewer, { cabinId, text: texto || null, media });
  } catch (erro) {
    if (erro instanceof Error) return { erro: erro.message };
    throw erro;
  }

  /*
   * A revalidação é a rede de segurança, não o caminho principal: quem já
   * está com a Cabine aberta recebe pelo Realtime. Ela existe para quem
   * acabou de enviar ver a própria mensagem mesmo se a assinatura cair.
   */
  revalidatePath(`/cabines/${cabinId}`);
  revalidatePath("/cabines");
  return { enviadas: (_anterior.enviadas ?? 0) + 1 };
}

/** Zera o contador de não lidas daquela Cabine. */
export async function marcarComoLida(cabinId: string) {
  const viewer = await quemPede();
  await marcarCabineComoLida(viewer, cabinId);
  revalidatePath("/cabines");
}

/** RN23: cada pessoa define quem pode convidá-la. */
export async function salvarQuemPodeConvidar(formulario: FormData) {
  const viewer = await quemPede();
  const escolha = String(formulario.get("invitePolicy") ?? "");

  await definirQuemPodeConvidar(viewer, escolha);
  revalidatePath("/configuracoes");
}

export type PessoaNaBusca = { id: string; nome: string; handle: string; avatarUrl: string | null };

/**
 * A busca da lista de Cabines: quem se segue com você.
 *
 * No servidor, e não filtrando no navegador: a lista de quem você segue
 * não cabe na tela, e filtrar o que já veio é uma busca que mente — foi o
 * que aconteceu com a busca de pessoas para convidar.
 */
export async function procurarParaConversar(termo: string): Promise<PessoaNaBusca[]> {
  const viewer = await quemPede();
  return pessoasParaConversar(viewer, termo);
}

/**
 * Abre a conversa com quem foi escolhido na busca.
 *
 * Se já existir uma, vai para ela: não existem duas conversas com a mesma
 * pessoa. Quem não se segue com você nem aparece na busca, então aqui a
 * recusa da RN20 é só a segunda barreira.
 */
export async function conversarCom(profileId: string) {
  const viewer = await quemPede();
  const cabinId = await abrirConversaDireta(viewer, profileId);
  revalidatePath("/cabines");
  redirect(`/cabines/${cabinId}`);
}
