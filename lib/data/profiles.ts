/**
 * Perfis (RN17, RN27, RN29, RN30).
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { updateProfileSchema } from "./validation";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { generateUniqueHandle } from "@/lib/auth/handle";

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
  ageVerifiedAt: Date;
  termsVersion: string;
  avatarUrl?: string | null;
  handle?: string;
}) {
  if (!input.ageVerifiedAt) {
    throw new ForbiddenError("RN29: cadastro exige verificação de idade");
  }
  if (!input.termsVersion) {
    throw new ForbiddenError("RN29: cadastro exige aceite dos Termos");
  }

  const handle = input.handle ?? (await suggestAvailableHandle(input.name));

  try {
    return await prisma.profile.create({
      data: {
        id: input.authUserId,
        handle,
        name: input.name,
        avatarUrl: input.avatarUrl ?? null,
        ageVerifiedAt: input.ageVerifiedAt,
        termsVersion: input.termsVersion,
      },
    });
  } catch (error) {
    // Duas pessoas podem gerar o mesmo @ no mesmo instante: a checagem prévia
    // não cobre isso, só o índice único. Aqui a colisão vira uma nova tentativa
    // em vez de erro na cara da pessoa.
    if (String(error).includes("handle")) {
      return prisma.profile.create({
        data: {
          id: input.authUserId,
          handle: await generateUniqueHandle(`${input.name}`, handleIsTaken),
          name: input.name,
          avatarUrl: input.avatarUrl ?? null,
          ageVerifiedAt: input.ageVerifiedAt,
          termsVersion: input.termsVersion,
        },
      });
    }
    throw error;
  }
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
