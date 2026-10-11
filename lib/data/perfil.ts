/**
 * O perfil de uma pessoa (RN27, RN28) e as defesas de quem usa.
 *
 * Princípio 2, **participação e não popularidade**, é o que explica as
 * ausências desta tela: seguidores é um número que não abre lista, e o
 * número de pessoas seguidas só o dono vê. Nada aqui existe para comparar
 * perfis.
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { enderecoDeMidia } from "@/lib/midia/deposito";

export type PerfilNaTela = {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  souEu: boolean;
  /** RN28: número, nunca lista. */
  seguidores: number;
  /** RN27: só no perfil próprio. `null` para visitante. */
  seguindo: number | null;
  respostas: number;
  comunidades: number;
  diasAtivos: number;
  /** Como quem olha se relaciona com esta pessoa. */
  euSigo: boolean;
  euBloqueei: boolean;
  euSilenciei: boolean;
};

/** RN28: dia ativo é o dia com ao menos uma resposta **ou** tópico. */
async function diasAtivos(profileId: string): Promise<number> {
  const linhas = await prisma.$queryRaw<{ dias: bigint }[]>`
    SELECT count(DISTINCT dia)::bigint AS dias FROM (
      SELECT hub_cycle_date(created_at) AS dia
        FROM answers WHERE author_id = ${profileId}::uuid AND deleted_at IS NULL
      UNION
      SELECT hub_cycle_date(created_at) AS dia
        FROM topics WHERE author_id = ${profileId}::uuid AND deleted_at IS NULL
    ) AS dias
  `;
  return Number(linhas[0]?.dias ?? 0);
}

/**
 * Tudo que o topo do perfil mostra.
 *
 * `seguindo` vem `null` para quem não é o dono — e não zero. Zero diria "não
 * segue ninguém"; nulo diz "não é da sua conta", que é a regra (RN27).
 */
export async function perfilNaTela(viewer: Viewer, handle: string): Promise<PerfilNaTela> {
  const perfil = await prisma.profile.findFirst({
    where: { handle, deletedAt: null },
    select: { id: true, handle: true, name: true, bio: true, avatarUrl: true },
  });
  if (!perfil) throw new NotFoundError("Perfil");

  const me = viewerProfileId(viewer);
  const souEu = me === perfil.id;

  const [seguidores, respostas, comunidades, dias, seguindo, relacao] = await Promise.all([
    prisma.follow.count({ where: { followedProfileId: perfil.id } }),
    prisma.answer.count({ where: { authorId: perfil.id, deletedAt: null } }),
    prisma.membership.count({ where: { profileId: perfil.id, bannedAt: null } }),
    diasAtivos(perfil.id),
    souEu
      ? prisma.follow.count({ where: { followerId: perfil.id, target: "profile" } })
      : Promise.resolve(null),
    me && !souEu ? relacaoCom(me, perfil.id) : Promise.resolve(null),
  ]);

  return {
    ...perfil,
    avatarUrl: await enderecoDeMidia(perfil.avatarUrl),
    souEu,
    seguidores,
    seguindo,
    respostas,
    comunidades,
    diasAtivos: dias,
    euSigo: relacao?.sigo ?? false,
    euBloqueei: relacao?.bloqueei ?? false,
    euSilenciei: relacao?.silenciei ?? false,
  };
}

async function relacaoCom(me: string, outra: string) {
  const [sigo, bloqueei, silenciei] = await Promise.all([
    prisma.follow.findFirst({ where: { followerId: me, followedProfileId: outra } }),
    prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: me, blockedId: outra } },
    }),
    prisma.mute.findUnique({ where: { muterId_mutedId: { muterId: me, mutedId: outra } } }),
  ]);
  return { sigo: sigo !== null, bloqueei: bloqueei !== null, silenciei: silenciei !== null };
}

export type RespostaNoPerfil = {
  id: string;
  /** Quando a pessoa **criou** o tópico em vez de responder. */
  criouOTopico: boolean;
  topico: { nome: string; slug: string; pergunta: string };
  comunidade: { nome: string; slug: string };
  texto: string | null;
  quando: Date;
};

/**
 * A aba Respostas: o que a pessoa escreveu, com o tópico e a pergunta.
 *
 * RN27 pede que cada resposta mostre o tópico e a pergunta — sem isso a
 * frase solta não quer dizer nada para quem chega de fora.
 *
 * Os tópicos criados entram na mesma lista, marcados: abrir um assunto é
 * participação tanto quanto responder.
 */
export async function respostasDoPerfil(
  viewer: Viewer,
  profileId: string,
  limite = 20,
): Promise<RespostaNoPerfil[]> {
  const linhas = await prisma.$queryRaw<
    {
      id: string;
      criou: boolean;
      topico_nome: string;
      topico_slug: string;
      pergunta: string;
      comunidade_nome: string;
      comunidade_slug: string;
      texto: string | null;
      quando: Date;
    }[]
  >`
    SELECT * FROM (
      SELECT a.id, false AS criou,
             t.name AS topico_nome, t.slug AS topico_slug, t.description AS pergunta,
             c.name AS comunidade_nome, c.slug AS comunidade_slug,
             a.text AS texto, a.created_at AS quando
        FROM answers a
        JOIN topics t ON t.id = a.topic_id AND t.deleted_at IS NULL
        JOIN communities c ON c.id = t.community_id AND c.deleted_at IS NULL
       WHERE a.author_id = ${profileId}::uuid AND a.deleted_at IS NULL
      UNION ALL
      SELECT t.id, true,
             t.name, t.slug, t.description,
             c.name, c.slug,
             NULL, t.created_at
        FROM topics t
        JOIN communities c ON c.id = t.community_id AND c.deleted_at IS NULL
       WHERE t.author_id = ${profileId}::uuid AND t.deleted_at IS NULL
    ) AS tudo
    ORDER BY quando DESC
    LIMIT ${limite}
  `;

  return linhas.map((l) => ({
    id: l.id,
    criouOTopico: l.criou,
    topico: { nome: l.topico_nome, slug: l.topico_slug, pergunta: l.pergunta },
    comunidade: { nome: l.comunidade_nome, slug: l.comunidade_slug },
    texto: l.texto,
    quando: l.quando,
  }));
}

export type ComunidadeNoPerfil = {
  id: string;
  slug: string;
  nome: string;
  membros: number;
  coverUrl: string | null;
  emComum: boolean;
};

/**
 * A aba Comunidades, **com as em comum primeiro**.
 *
 * A ordem é a informação: o que interessa a quem chega num perfil é onde
 * vocês já se cruzam.
 */
export async function comunidadesDoPerfil(
  viewer: Viewer,
  profileId: string,
): Promise<ComunidadeNoPerfil[]> {
  const me = viewerProfileId(viewer);

  const linhas = await prisma.$queryRaw<
    {
      id: string;
      slug: string;
      nome: string;
      membros: number;
      cover_url: string | null;
      em_comum: boolean;
    }[]
  >`
    SELECT c.id, c.slug, c.name AS nome, c.members_count AS membros, c.cover_url,
           EXISTS (
             SELECT 1 FROM memberships minha
              WHERE minha.community_id = c.id
                AND minha.profile_id = ${me}::uuid
                AND minha.banned_at IS NULL
           ) AS em_comum
      FROM memberships m
      JOIN communities c ON c.id = m.community_id AND c.deleted_at IS NULL
     WHERE m.profile_id = ${profileId}::uuid AND m.banned_at IS NULL
     ORDER BY em_comum DESC, c.members_count DESC, c.name ASC
  `;

  const capas = await Promise.all(linhas.map((l) => enderecoDeMidia(l.cover_url)));

  return linhas.map((l, i) => ({
    id: l.id,
    slug: l.slug,
    nome: l.nome,
    membros: l.membros,
    coverUrl: capas.at(i) ?? null,
    emComum: l.em_comum,
  }));
}

/**
 * RN26: bloquear esconde nos dois sentidos.
 *
 * E **desfaz o seguir dos dois lados**: manter um "seguindo" invisível para
 * alguém que você bloqueou é um estado mentiroso — a tela diria que você
 * acompanha uma pessoa cujo conteúdo não chega mais.
 */
export async function bloquear(viewer: Viewer, profileId: string) {
  const me = requireProfileId(viewer);
  if (me === profileId) throw new ForbiddenError("Não dá para bloquear a si mesmo");

  await prisma.$transaction([
    prisma.block.upsert({
      where: { blockerId_blockedId: { blockerId: me, blockedId: profileId } },
      create: { blockerId: me, blockedId: profileId },
      update: {},
    }),
    prisma.follow.deleteMany({
      where: {
        target: "profile",
        OR: [
          { followerId: me, followedProfileId: profileId },
          { followerId: profileId, followedProfileId: me },
        ],
      },
    }),
  ]);
}

export async function desbloquear(viewer: Viewer, profileId: string) {
  const me = requireProfileId(viewer);
  await prisma.block.deleteMany({ where: { blockerId: me, blockedId: profileId } });
}

/**
 * Silenciar: some do **seu** Início e nada mais.
 *
 * Não desfaz o seguir, não avisa ninguém, não tira nada de quem foi
 * silenciado. É a saída para quem incomoda sem fazer mal — e ter esta saída
 * é o que evita que bloquear vire a única resposta possível.
 */
export async function silenciar(viewer: Viewer, profileId: string) {
  const me = requireProfileId(viewer);
  if (me === profileId) throw new ForbiddenError("Não dá para silenciar a si mesmo");

  await prisma.mute.upsert({
    where: { muterId_mutedId: { muterId: me, mutedId: profileId } },
    create: { muterId: me, mutedId: profileId },
    update: {},
  });
}

export async function dessilenciar(viewer: Viewer, profileId: string) {
  const me = requireProfileId(viewer);
  await prisma.mute.deleteMany({ where: { muterId: me, mutedId: profileId } });
}
