/**
 * Descoberta: Explorar, busca e Universos (F06).
 *
 * RN05: comunidade com menos de 20 membros **não aparece** em Explorar nem no
 * Universo — só na busca. É o que impede o Hub de parecer um cemitério de
 * comunidades vazias, sem esconder nada de quem procura pelo nome.
 */
import { prisma } from "./prisma";
import { NotFoundError } from "./errors";
import { viewerProfileId, type Viewer } from "./viewer";
import { EXPLORE_MIN_MEMBERS } from "./communities";

/** Linha de comunidade, como as telas 9, 10 e 11 mostram. */
export type ComunidadeNaLista = {
  id: string;
  name: string;
  intro: string;
  coverUrl: string | null;
  membersCount: number;
  universo: { id: string; name: string; slug: string };
  /** Se quem está olhando já é membro — define o estado do botão #. */
  souMembro: boolean;
  /** Respostas de hoje, no fuso do ciclo. Só a página do Universo mostra. */
  respostasHoje?: number;
};

type LinhaCrua = {
  id: string;
  name: string;
  intro: string;
  cover_url: string | null;
  members_count: number;
  universe_id: string;
  universe_name: string;
  universe_slug: string;
  sou_membro: boolean;
  respostas_hoje: string | null;
};

function montar(linha: LinhaCrua): ComunidadeNaLista {
  return {
    id: linha.id,
    name: linha.name,
    intro: linha.intro,
    coverUrl: linha.cover_url,
    membersCount: linha.members_count,
    universo: { id: linha.universe_id, name: linha.universe_name, slug: linha.universe_slug },
    souMembro: linha.sou_membro,
    ...(linha.respostas_hoje === null ? {} : { respostasHoje: Number(linha.respostas_hoje) }),
  };
}

/**
 * Explorar: os Universos e a lista "Para você".
 *
 * A regra do "Para você" é simples e dá para explicar numa frase:
 * **comunidades dos Universos onde você já está, nas quais ainda não entrou,
 * as maiores primeiro.** Sem nenhuma, as maiores do Hub.
 *
 * Recomendação de verdade é outra feature. Uma regra que cabe numa frase é
 * melhor do que uma caixa-preta agora — dá para explicar a quem pergunta por
 * que viu aquilo.
 */
export async function paraVoce(
  viewer: Viewer,
  limite = 10,
  minimoDeMembros = EXPLORE_MIN_MEMBERS,
): Promise<ComunidadeNaLista[]> {
  const me = viewerProfileId(viewer);

  const linhas = await prisma.$queryRaw<LinhaCrua[]>`
    WITH meus_universos AS (
      SELECT DISTINCT c.universe_id
        FROM memberships m
        JOIN communities c ON c.id = m.community_id
       WHERE m.profile_id = ${me}::uuid AND m.banned_at IS NULL
    )
    SELECT c.id, c.name, c.intro, c.cover_url, c.members_count,
           u.id AS universe_id, u.name AS universe_name, u.slug AS universe_slug,
           false AS sou_membro, NULL AS respostas_hoje
      FROM communities c
      JOIN universes u ON u.id = c.universe_id
     WHERE c.deleted_at IS NULL
       -- RN05: só a partir do corte de membros.
       AND c.members_count >= ${minimoDeMembros}
       AND NOT EXISTS (
         SELECT 1 FROM memberships m
          WHERE m.community_id = c.id AND m.profile_id = ${me}::uuid
       )
     ORDER BY
       -- Primeiro as dos Universos que a pessoa já frequenta.
       (c.universe_id IN (SELECT universe_id FROM meus_universos)) DESC,
       c.members_count DESC,
       c.name ASC
     LIMIT ${limite}
  `;

  return linhas.map(montar);
}

export type OrdemDoUniverso = "atividade" | "recentes";

/**
 * Comunidades de um Universo (tela 11), com busca dentro dele.
 *
 * "Respostas hoje" usa o **mesmo fuso do ciclo das 00h**. Dois conceitos de
 * "hoje" no mesmo produto confundiriam quem usa e quem mantém.
 */
export async function comunidadesDoUniverso(
  viewer: Viewer,
  slug: string,
  opcoes: { termo?: string; ordem?: OrdemDoUniverso; minimoDeMembros?: number } = {},
) {
  const me = viewerProfileId(viewer);
  const ordem = opcoes.ordem ?? "atividade";
  const termo = opcoes.termo?.trim() ?? "";
  const minimoDeMembros = opcoes.minimoDeMembros ?? EXPLORE_MIN_MEMBERS;

  const universo = await prisma.universe.findUnique({ where: { slug } });
  if (!universo) throw new NotFoundError("Universo");

  const linhas = await prisma.$queryRaw<LinhaCrua[]>`
    SELECT c.id, c.name, c.intro, c.cover_url, c.members_count,
           u.id AS universe_id, u.name AS universe_name, u.slug AS universe_slug,
           EXISTS (
             SELECT 1 FROM memberships m
              WHERE m.community_id = c.id AND m.profile_id = ${me}::uuid
                AND m.banned_at IS NULL
           ) AS sou_membro,
           (
             SELECT count(*)
               FROM answers a
               JOIN topics t ON t.id = a.topic_id
              WHERE t.community_id = c.id
                AND a.deleted_at IS NULL
                AND hub_cycle_date(a.created_at) = hub_cycle_date(now())
           ) AS respostas_hoje
      FROM communities c
      JOIN universes u ON u.id = c.universe_id
     WHERE c.deleted_at IS NULL
       AND c.universe_id = ${universo.id}::uuid
       -- RN05: o corte vale aqui também.
       AND c.members_count >= ${minimoDeMembros}
       AND (${termo} = '' OR hub_busca(c.name) LIKE '%' || hub_busca(${termo}) || '%')
     ORDER BY
       CASE WHEN ${ordem} = 'recentes' THEN c.created_at END DESC,
       CASE WHEN ${ordem} = 'atividade' THEN c.members_count END DESC,
       c.name ASC
  `;

  return { universo, comunidades: linhas.map(montar) };
}

/**
 * Busca de comunidades.
 *
 * **Sem o corte de 20 membros** (RN05): quem procura pelo nome encontra, por
 * menor que seja. O corte existe para não entulhar a descoberta, não para
 * esconder.
 */
export async function buscarComunidades(viewer: Viewer, termo: string, limite = 20) {
  const me = viewerProfileId(viewer);
  const busca = termo.trim();
  if (!busca) return [];

  const linhas = await prisma.$queryRaw<LinhaCrua[]>`
    SELECT c.id, c.name, c.intro, c.cover_url, c.members_count,
           u.id AS universe_id, u.name AS universe_name, u.slug AS universe_slug,
           EXISTS (
             SELECT 1 FROM memberships m
              WHERE m.community_id = c.id AND m.profile_id = ${me}::uuid
                AND m.banned_at IS NULL
           ) AS sou_membro,
           NULL AS respostas_hoje
      FROM communities c
      JOIN universes u ON u.id = c.universe_id
     WHERE c.deleted_at IS NULL
       AND hub_busca(c.name) LIKE '%' || hub_busca(${busca}) || '%'
     ORDER BY c.members_count DESC, c.name ASC
     LIMIT ${limite}
  `;

  return linhas.map(montar);
}

export type TopicoNaBusca = {
  id: string;
  name: string;
  comunidade: { id: string; name: string };
  pessoas: number;
  respostas: number;
};

/** RN15: tópico mostra pessoas e respostas. Nunca um placar. */
export async function buscarTopicos(viewer: Viewer, termo: string, limite = 20) {
  const busca = termo.trim();
  if (!busca) return [];

  const linhas = await prisma.$queryRaw<
    {
      id: string;
      name: string;
      community_id: string;
      community_name: string;
      pessoas: string;
      respostas: string;
    }[]
  >`
    SELECT t.id, t.name, c.id AS community_id, c.name AS community_name,
           (SELECT count(DISTINCT a.author_id) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS pessoas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS respostas
      FROM topics t
      JOIN communities c ON c.id = t.community_id
     WHERE t.deleted_at IS NULL AND c.deleted_at IS NULL
       AND hub_busca(t.name) LIKE '%' || hub_busca(${busca}) || '%'
     ORDER BY t.created_at DESC
     LIMIT ${limite}
  `;

  return linhas.map((l): TopicoNaBusca => ({
    id: l.id,
    name: l.name,
    comunidade: { id: l.community_id, name: l.community_name },
    pessoas: Number(l.pessoas),
    respostas: Number(l.respostas),
  }));
}

export type PessoaNaBusca = {
  id: string;
  handle: string;
  name: string;
  avatarUrl: string | null;
  comunidadesEmComum: number;
  seguindo: boolean;
};

/**
 * Busca de pessoas, por nome ou por @.
 *
 * RN26: quem bloqueou, ou foi bloqueado, não aparece.
 */
export async function buscarPessoas(viewer: Viewer, termo: string, limite = 20) {
  const me = viewerProfileId(viewer);
  const busca = termo.trim();
  if (!busca) return [];

  const linhas = await prisma.$queryRaw<
    {
      id: string;
      handle: string;
      name: string;
      avatar_url: string | null;
      em_comum: string;
      seguindo: boolean;
    }[]
  >`
    SELECT p.id, p.handle, p.name, p.avatar_url,
           (
             SELECT count(*) FROM memberships m1
              JOIN memberships m2 ON m2.community_id = m1.community_id
             WHERE m1.profile_id = p.id AND m2.profile_id = ${me}::uuid
               AND m1.banned_at IS NULL AND m2.banned_at IS NULL
           ) AS em_comum,
           EXISTS (
             SELECT 1 FROM follows f
              WHERE f.follower_id = ${me}::uuid AND f.followed_profile_id = p.id
           ) AS seguindo
      FROM profiles p
     WHERE p.deleted_at IS NULL
       AND p.id <> ${me}::uuid
       AND (hub_busca(p.name) LIKE '%' || hub_busca(${busca}) || '%'
            OR p.handle LIKE '%' || lower(${busca}) || '%')
       -- RN26: bloqueio esconde nos dois sentidos.
       AND NOT EXISTS (
         SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ${me}::uuid AND b.blocked_id = p.id)
             OR (b.blocker_id = p.id AND b.blocked_id = ${me}::uuid)
       )
     ORDER BY p.name ASC
     LIMIT ${limite}
  `;

  return linhas.map((l): PessoaNaBusca => ({
    id: l.id,
    handle: l.handle,
    name: l.name,
    avatarUrl: l.avatar_url,
    comunidadesEmComum: Number(l.em_comum),
    seguindo: l.seguindo,
  }));
}

/** Os quatro Universos da grade de Explorar, com quantas comunidades têm. */
export async function universosComContagem() {
  return prisma.universe.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      slug: true,
      _count: { select: { communities: { where: { deletedAt: null } } } },
    },
  });
}
