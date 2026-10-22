/**
 * Perfis (RN17, RN27, RN29, RN30).
 */
import { prisma } from "./prisma";
import { ForbiddenError, translateDatabaseError } from "./errors";
import { updateProfileSchema } from "./validation";
import { requireProfileId, type Viewer } from "./viewer";
import { generateUniqueHandle, suggestHandle, withSuffix } from "@/lib/auth/handle";
import type { AgeVerificationMethod } from "@/lib/auth/age-verifier";

/** RN17: o @ é único. Exportado para a tela avisar antes de enviar. */
export async function handleEmUso(handle: string): Promise<boolean> {
  return handleIsTaken(handle);
}

async function handleIsTaken(handle: string): Promise<boolean> {
  const found = await prisma.profile.findUnique({ where: { handle }, select: { id: true } });
  return found !== null;
}

/** RN17: sugere um @ livre a partir do nome. */
export async function suggestAvailableHandle(name: string): Promise<string> {
  return generateUniqueHandle(name, handleIsTaken);
}

/**
 * O email de quem tem este @, para a pessoa poder entrar pelo @ (F03+).
 *
 * O Supabase Auth só conhece email e senha; entrar pelo @ exige traduzir um
 * no outro aqui dentro. O email **nunca** volta para a tela: ele serve só
 * para a chamada de login, e a resposta é a mesma de sempre, dê certo ou não.
 *
 * `auth.users` é schema do Supabase e não está no schema do Prisma — por isso
 * SQL cru. `profiles.id` é o id do usuário de autenticação, então o encontro
 * entre os dois é direto.
 *
 * Por que isto não abre a porta de enumeração: o @ **já é público** no Hub,
 * aparece na busca de pessoas e no endereço do perfil. O que precisa ficar
 * escondido é quais **emails** têm conta, e isso continua escondido.
 */
export async function emailDeQuemTemOHandle(handle: string): Promise<string | null> {
  const linhas = await prisma.$queryRaw<{ email: string | null }[]>`
    SELECT u.email
      FROM profiles p
      JOIN auth.users u ON u.id = p.id
     WHERE p.handle = ${handle.toLowerCase()}
       AND p.deleted_at IS NULL
     LIMIT 1
  `;
  return linhas[0]?.email ?? null;
}

/**
 * O @ de quem está logado.
 *
 * A tela de perfil próprio e a de outra pessoa são a mesma, e ela recebe um
 * @. Esta função é a ponte: `/perfil` precisa saber qual é o seu.
 */
export async function meuHandle(viewer: Viewer): Promise<string> {
  const me = requireProfileId(viewer);
  const perfil = await prisma.profile.findUniqueOrThrow({
    where: { id: me },
    select: { handle: true },
  });
  return perfil.handle;
}

export async function getProfileByAuthId(authUserId: string) {
  return prisma.profile.findUnique({
    where: { id: authUserId },
    // O banimento da plataforma vem junto, e não numa segunda consulta: ele
    // é lido em toda requisição, e a sessão é o único lugar onde adianta
    // conferir — barrar só nas escritas deixaria a pessoa banida circulando.
    include: { platformBan: { select: { createdAt: true } } },
  });
}

/**
 * Cria o perfil de quem acabou de se cadastrar.
 *
 * Não recebe `Viewer` porque é chamada no instante em que a sessão nasce: o
 * `authUserId` **vem da sessão do Supabase**, nunca do formulário. Se viesse
 * do corpo da requisição, qualquer pessoa criaria perfil no id de outra.
 *
 * RN29: `ageVerifiedAt` e `termsVersion` são obrigatórios aqui. Sem eles não
 * há cadastro — é a regra, não uma conveniência da tela.
 */
export async function createProfile(input: {
  authUserId: string;
  name: string;
  /** Data informada no cadastro, guardada para reavaliar quando a regra mudar. */
  birthDate: Date;
  ageVerifiedAt: Date;
  ageVerificationMethod: AgeVerificationMethod;
  termsVersion: string;
  avatarUrl?: string | null;
  handle?: string;
}) {
  if (!input.ageVerifiedAt || !input.ageVerificationMethod) {
    throw new ForbiddenError("Cadastro exige verificação de idade");
  }
  if (!input.birthDate) {
    throw new ForbiddenError("Cadastro exige a data de nascimento");
  }
  if (!input.termsVersion) {
    throw new ForbiddenError("RN29: cadastro exige aceite dos Termos");
  }

  const handle = input.handle ?? (await suggestAvailableHandle(input.name));

  const dados = {
    id: input.authUserId,
    name: input.name,
    avatarUrl: input.avatarUrl ?? null,
    birthDate: input.birthDate,
    ageVerificationStatus: "verified",
    ageVerificationMethod: input.ageVerificationMethod,
    ageVerifiedAt: input.ageVerifiedAt,
    termsVersion: input.termsVersion,
  } as const;

  /*
   * O @ pode colidir mesmo depois da checagem prévia: duas pessoas com o
   * mesmo nome cadastrando no mesmo instante geram o mesmo candidato, e só o
   * índice único separa as duas. Daí o laço.
   *
   * Quando o @ veio escolhido à mão (fluxo do Google), não há retentativa:
   * trocar em silêncio o @ que a pessoa digitou seria pior do que avisar.
   */
  const escolhidoPelaPessoa = input.handle !== undefined;
  let candidato = handle;

  for (let tentativa = 0; tentativa < 5; tentativa += 1) {
    try {
      return await prisma.profile.create({ data: { ...dados, handle: candidato } });
    } catch (error) {
      const ultimaChance = tentativa === 4;
      if (escolhidoPelaPessoa || ultimaChance || !ehHandleDuplicado(error)) throw error;

      // Depois da segunda colisão, sufixo aleatório: continuar contando a
      // partir do nome levaria todo mundo ao mesmo próximo candidato.
      candidato =
        tentativa === 0
          ? await generateUniqueHandle(input.name, handleIsTaken)
          : withSuffix(suggestHandle(input.name), Math.floor(Math.random() * 100_000));
    }
  }

  // Inalcançável: o laço devolve ou lança.
  throw new Error("Não foi possível gerar um @ livre");
}

/** Violação do índice único de `handle` — P2002 é o código do Prisma. */
function ehHandleDuplicado(error: unknown): boolean {
  const e = error as { code?: string; meta?: { target?: unknown } };
  if (e?.code !== "P2002") return false;
  return JSON.stringify(e.meta?.target ?? "").includes("handle");
}

/** RN27/RN30: nome, descrição de até 120 caracteres sem links, foto opcional. */
export async function updateProfile(viewer: Viewer, input: unknown) {
  const me = requireProfileId(viewer);
  const data = updateProfileSchema.parse(input);

  /*
   * Só o que veio é alterado. Antes, um campo ausente virava `null` — e
   * salvar nome e descrição apagaria a foto, que é enviada por outro
   * caminho.
   */
  try {
    return await prisma.$transaction(async (tx) => {
      const perfil = await tx.profile.update({
        where: { id: me },
        data: {
          name: data.name,
          ...(data.handle === undefined ? {} : { handle: data.handle }),
          ...(data.bio === undefined ? {} : { bio: data.bio }),
          ...(data.avatarCaminho === undefined ? {} : { avatarUrl: data.avatarCaminho }),
          ...(data.backgroundKey === undefined ? {} : { backgroundKey: data.backgroundKey }),
          ...(data.hideFollowers === undefined ? {} : { hideFollowers: data.hideFollowers }),
          ...(data.enquadramento === undefined
            ? {}
            : {
                avatarZoom: data.enquadramento.zoom,
                avatarOffsetX: data.enquadramento.ox,
                avatarOffsetY: data.enquadramento.oy,
              }),
        },
      });

      /*
       * RN27: a lista de links chega inteira e substitui a que havia.
       *
       * Apagar e regravar, em vez de comparar item a item: assim apagar o
       * do meio e reordenar funcionam sem nenhuma operação a mais, e a
       * posição continua sendo o que ela diz ser — a ordem na tela. Dentro
       * da transação, ninguém chega a ver o perfil sem links.
       */
      if (data.links !== undefined) {
        await tx.profileLink.deleteMany({ where: { profileId: me } });
        if (data.links.length > 0) {
          await tx.profileLink.createMany({
            data: data.links.map((link, position) => ({
              profileId: me,
              position,
              title: link.title,
              url: link.url,
            })),
          });
        }
      }

      return perfil;
    });
  } catch (error) {
    // RN17: o @ é único. O índice é a garantia; aqui vira mensagem.
    translateDatabaseError(error);
  }
}

/**
 * RN34: liga e desliga um tipo de notificação.
 *
 * A lista de campos é fechada aqui, e não montada a partir do que chega do
 * formulário: sem isso, um campo qualquer do perfil viraria alvo de
 * escrita — `onboardedAt`, `handle`, o que fosse.
 */
const CAMPOS_DE_NOTIFICACAO = [
  "notifyTopicBecameHot",
  "notifyCabin",
  "notifyFollowedTopics",
  "notifyNewTopicInCommunity",
  "notifyMention",
] as const;

export type CampoDeNotificacao = (typeof CAMPOS_DE_NOTIFICACAO)[number];

export async function definirPreferenciaDeNotificacao(
  viewer: Viewer,
  campo: string,
  ligado: boolean,
) {
  const me = requireProfileId(viewer);

  const valido = CAMPOS_DE_NOTIFICACAO.find((conhecido) => conhecido === campo);
  if (!valido) throw new ForbiddenError("Preferência de notificação desconhecida");

  await prisma.profile.update({ where: { id: me }, data: { [valido]: ligado } });
}

/** As cinco escolhas atuais, para a tela desenhar os interruptores. */
export async function preferenciasDeNotificacao(viewer: Viewer) {
  const me = requireProfileId(viewer);
  return prisma.profile.findUniqueOrThrow({
    where: { id: me },
    select: {
      notifyTopicBecameHot: true,
      notifyCabin: true,
      notifyFollowedTopics: true,
      notifyNewTopicInCommunity: true,
      notifyMention: true,
    },
  });
}

/** RN23: a escolha atual de quem pode me convidar. */
export async function quemPodeMeConvidar(viewer: Viewer): Promise<"community_members" | "nobody"> {
  const me = requireProfileId(viewer);
  const perfil = await prisma.profile.findUniqueOrThrow({
    where: { id: me },
    select: { invitePolicy: true },
  });
  return perfil.invitePolicy;
}

/**
 * RN23: cada pessoa define quem pode convidá-la para uma Cabine.
 *
 * São só dois valores: membros das minhas comunidades, ou ninguém. Não
 * existe "todo mundo" — convidar já exige comunidade em comum (RN21), então
 * a escolha é entre o padrão e fechar a porta.
 */
export async function definirQuemPodeConvidar(viewer: Viewer, escolha: string) {
  const me = requireProfileId(viewer);

  if (escolha !== "community_members" && escolha !== "nobody") {
    throw new ForbiddenError("Escolha inválida para quem pode te convidar");
  }

  await prisma.profile.update({ where: { id: me }, data: { invitePolicy: escolha } });
}

/**
 * As medidas da foto que já está guardada (RN30).
 *
 * A ação precisa delas para conferir o enquadramento quando a pessoa só
 * reposiciona a foto, sem trocá-la: sem as proporções não há limite contra
 * o que comparar.
 */
export async function medidasDaFotoAtual(
  viewer: Viewer,
): Promise<{ largura: number; altura: number } | null> {
  const me = requireProfileId(viewer);
  const perfil = await prisma.profile.findUnique({
    where: { id: me },
    select: { avatarWidth: true, avatarHeight: true },
  });

  return perfil?.avatarWidth && perfil.avatarHeight
    ? { largura: perfil.avatarWidth, altura: perfil.avatarHeight }
    : null;
}

/**
 * Grava as medidas da foto nova.
 *
 * Separado de `updateProfile` porque pertence à foto, não ao formulário:
 * só muda quando a imagem muda, e um arquivo que não dá para medir zera as
 * duas — aí o avatar centraliza sozinho, que é o comportamento de antes.
 */
export async function guardarMedidasDaFoto(
  viewer: Viewer,
  medidas: { largura: number; altura: number } | null,
): Promise<void> {
  const me = requireProfileId(viewer);
  await prisma.profile.update({
    where: { id: me },
    data: { avatarWidth: medidas?.largura ?? null, avatarHeight: medidas?.altura ?? null },
  });
}
