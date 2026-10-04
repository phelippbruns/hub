/**
 * Perfis (RN17, RN27, RN29, RN30).
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { updateProfileSchema } from "./validation";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
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

export async function getProfileByAuthId(authUserId: string) {
  return prisma.profile.findUnique({ where: { id: authUserId } });
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

  return prisma.profile.update({
    where: { id: me },
    data: {
      name: data.name,
      bio: data.bio ?? null,
      avatarUrl: data.avatarUrl ?? null,
    },
  });
}

/** RN27/RN28: o perfil público. Seguidores são informativos e não abrem lista. */
export async function getProfileForViewer(viewer: Viewer, handle: string) {
  const profile = await prisma.profile.findFirst({
    where: { handle, deletedAt: null },
    select: {
      id: true,
      handle: true,
      name: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
    },
  });
  if (!profile) throw new NotFoundError("Perfil");

  const me = viewerProfileId(viewer);

  const [followers, answers, communities, activeDays] = await Promise.all([
    prisma.follow.count({ where: { followedProfileId: profile.id } }),
    // RN28: os contadores são respostas, comunidades e dias ativos.
    prisma.answer.count({ where: { authorId: profile.id, deletedAt: null } }),
    prisma.membership.count({ where: { profileId: profile.id, bannedAt: null } }),
    countActiveDays(profile.id),
  ]);

  return {
    ...profile,
    isSelf: me === profile.id,
    counts: { followers, answers, communities, activeDays },
  };
}

/** RN28: dia ativo é o dia com ao menos uma resposta ou tópico. */
async function countActiveDays(profileId: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ days: bigint }[]>`
    SELECT count(DISTINCT dia)::bigint AS days FROM (
      SELECT (created_at AT TIME ZONE hub_cycle_timezone())::date AS dia
        FROM answers WHERE author_id = ${profileId}::uuid AND deleted_at IS NULL
      UNION
      SELECT (created_at AT TIME ZONE hub_cycle_timezone())::date AS dia
        FROM topics  WHERE author_id = ${profileId}::uuid AND deleted_at IS NULL
    ) AS dias
  `;
  return Number(rows[0]?.days ?? 0);
}
