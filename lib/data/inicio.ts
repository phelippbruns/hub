/**
 * O que o Início mostra (RN19).
 *
 * Princípio 1: **comunidades são o centro.** O conteúdo de pessoas não
 * define esta tela — ele aparece depois dos destaques, e limitado.
 *
 * Princípio 3: **a lista termina.** Nada aqui pagina; cada seção tem um teto
 * e a tela acaba em "Você está em dia".
 */
import { prisma } from "./prisma";
import { viewerProfileId, type Viewer } from "./viewer";

/** Até onde cada seção vai. A tela termina, então os limites são a regra. */
const LIMITES = {
  /** RN19: "até 3 interações recentes de pessoas que você segue". */
  pessoas: 3,
  topicosSeguidos: 5,
  minhasInteracoes: 5,
} as const;

export type DestaqueDoInicio = {
  topicId: string;
  topicoSlug: string;
  nome: string;
  abertura: string;
  comunidade: { nome: string; slug: string };
  pessoas: number;
  respostas: number;
};

/**
 * Os Hot Topics de hoje, só das comunidades de que sou membro.
 *
 * RN19. O "só das minhas" não é refinamento: sem ele o Início mostraria o
 * destaque de comunidades em que a pessoa nunca entrou.
 */
export async function hotTopicsParaMim(viewer: Viewer): Promise<DestaqueDoInicio[]> {
  const me = viewerProfileId(viewer);
  if (!me) return [];

  const linhas = await prisma.$queryRaw<
    {
      topic_id: string;
      topico_slug: string;
      nome: string;
      abertura: string;
      comunidade_nome: string;
      comunidade_slug: string;
      pessoas: string;
      respostas: string;
    }[]
  >`
    SELECT t.id AS topic_id, t.slug AS topico_slug, t.name AS nome, t.description AS abertura,
           c.name AS comunidade_nome, c.slug AS comunidade_slug,
           (SELECT count(DISTINCT a.author_id) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS pessoas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS respostas
      FROM hot_topics h
      JOIN topics t ON t.id = h.topic_id AND t.deleted_at IS NULL
      JOIN communities c ON c.id = h.community_id AND c.deleted_at IS NULL
      JOIN memberships m ON m.community_id = c.id
                        AND m.profile_id = ${me}::uuid
                        AND m.banned_at IS NULL
     WHERE h.cycle_date = hub_cycle_date(now())
     ORDER BY h.distinct_respondents DESC, c.name ASC
  `;

  return linhas.map((l) => ({
    topicId: l.topic_id,
    topicoSlug: l.topico_slug,
    nome: l.nome,
    abertura: l.abertura,
    comunidade: { nome: l.comunidade_nome, slug: l.comunidade_slug },
    pessoas: Number(l.pessoas),
    respostas: Number(l.respostas),
  }));
}

export type TopicoSeguido = {
  topicId: string;
  topicoSlug: string;
  nome: string;
  comunidade: { nome: string; slug: string };
  pessoas: number;
  respostas: number;
  novas: number;
};

/**
 * Os tópicos que a pessoa segue, com o que chegou desde a última visita.
 *
 * "Nova" quer dizer **depois da última vez que ela abriu aquele tópico** —
 * decisão tomada com o PO. É a única leitura em que o número zera quando a
 * pessoa lê.
 *
 * Sem visita registrada, conta a partir de quando ela começou a seguir: é o
 * mais próximo de "o que apareceu desde que isto passou a me interessar".
 */
export async function topicosQueSigoComNovas(viewer: Viewer): Promise<TopicoSeguido[]> {
  const me = viewerProfileId(viewer);
  if (!me) return [];

  const linhas = await prisma.$queryRaw<
    {
      topic_id: string;
      topico_slug: string;
      nome: string;
      comunidade_nome: string;
      comunidade_slug: string;
      pessoas: string;
      respostas: string;
      novas: string;
    }[]
  >`
    SELECT t.id AS topic_id, t.slug AS topico_slug, t.name AS nome,
           c.name AS comunidade_nome, c.slug AS comunidade_slug,
           (SELECT count(DISTINCT a.author_id) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS pessoas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS respostas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id
               AND a.deleted_at IS NULL
               AND a.created_at > COALESCE(f.last_seen_at, f.created_at)
               -- A própria resposta nunca é novidade para quem a escreveu.
               AND a.author_id IS DISTINCT FROM ${me}::uuid) AS novas
      FROM follows f
      JOIN topics t ON t.id = f.topic_id AND t.deleted_at IS NULL
      JOIN communities c ON c.id = t.community_id AND c.deleted_at IS NULL
     WHERE f.follower_id = ${me}::uuid AND f.target = 'topic'
     ORDER BY novas DESC, t.created_at DESC
     LIMIT ${LIMITES.topicosSeguidos}
  `;

  return linhas.map((l) => ({
    topicId: l.topic_id,
    topicoSlug: l.topico_slug,
    nome: l.nome,
    comunidade: { nome: l.comunidade_nome, slug: l.comunidade_slug },
    pessoas: Number(l.pessoas),
    respostas: Number(l.respostas),
    novas: Number(l.novas),
  }));
}

export type InteracaoDeQuemSigo = {
  id: string;
  quem: { nome: string; handle: string };
  oQueFez: "respondeu" | "criou";
  topico: { nome: string; slug: string };
  comunidade: { nome: string; slug: string };
  quando: Date;
};

/**
 * O que as pessoas seguidas fizeram, **no máximo 3**.
 *
 * O teto é regra, não corte de desempenho: o Princípio 1 diz que o conteúdo
 * de pessoas não define o Início. Três é o suficiente para dar vontade de
 * visitar um perfil, e pouco o bastante para a tela continuar sendo sobre
 * comunidades.
 */
export async function interacoesDeQuemSigo(viewer: Viewer): Promise<InteracaoDeQuemSigo[]> {
  const me = viewerProfileId(viewer);
  if (!me) return [];

  const linhas = await prisma.$queryRaw<
    {
      id: string;
      nome: string;
      handle: string;
      o_que_fez: "respondeu" | "criou";
      topico_nome: string;
      topico_slug: string;
      comunidade_nome: string;
      comunidade_slug: string;
      quando: Date;
    }[]
  >`
    WITH seguidas AS (
      SELECT followed_profile_id AS id
        FROM follows
       WHERE follower_id = ${me}::uuid AND target = 'profile'
    ),
    /* RN26: bloqueio esconde nos dois sentidos. */
    visiveis AS (
      SELECT s.id FROM seguidas s
       WHERE NOT EXISTS (
         SELECT 1 FROM blocks b
          WHERE (b.blocker_id = ${me}::uuid AND b.blocked_id = s.id)
             OR (b.blocker_id = s.id AND b.blocked_id = ${me}::uuid)
       )
         /*
          * F12: silenciar tira a pessoa **daqui**, e só daqui. Diferente de
          * bloquear, ela continua sendo seguida e não perde nada — é a
          * saída para quem posta demais, não para quem faz mal.
          */
         AND NOT EXISTS (
           SELECT 1 FROM mutes mu
            WHERE mu.muter_id = ${me}::uuid AND mu.muted_id = s.id
         )
    ),
    acoes AS (
      SELECT a.id, a.author_id, 'respondeu'::text AS o_que_fez,
             a.topic_id, a.created_at AS quando
        FROM answers a
       WHERE a.deleted_at IS NULL AND a.author_id IN (SELECT id FROM visiveis)
      UNION ALL
      SELECT t.id, t.author_id, 'criou'::text, t.id, t.created_at
        FROM topics t
       WHERE t.deleted_at IS NULL AND t.author_id IN (SELECT id FROM visiveis)
    )
    SELECT acoes.id, p.name AS nome, p.handle, acoes.o_que_fez,
           t.name AS topico_nome, t.slug AS topico_slug,
           c.name AS comunidade_nome, c.slug AS comunidade_slug,
           acoes.quando
      FROM acoes
      JOIN profiles p ON p.id = acoes.author_id AND p.deleted_at IS NULL
      JOIN topics t ON t.id = acoes.topic_id AND t.deleted_at IS NULL
      JOIN communities c ON c.id = t.community_id AND c.deleted_at IS NULL
     ORDER BY acoes.quando DESC
     LIMIT ${LIMITES.pessoas}
  `;

  return linhas.map((l) => ({
    id: l.id,
    quem: { nome: l.nome, handle: l.handle },
    oQueFez: l.o_que_fez,
    topico: { nome: l.topico_nome, slug: l.topico_slug },
    comunidade: { nome: l.comunidade_nome, slug: l.comunidade_slug },
    quando: l.quando,
  }));
}

export type MinhaInteracao = {
  topicId: string;
  topicoSlug: string;
  nome: string;
  comunidade: { nome: string; slug: string };
  pessoas: number;
  respostas: number;
  /** Quantas chegaram **depois da minha última** — outra conta que "novas". */
  depoisDaMinha: number;
};

/** Os tópicos em que respondi, e o que veio depois da minha última resposta. */
export async function minhasUltimasInteracoes(viewer: Viewer): Promise<MinhaInteracao[]> {
  const me = viewerProfileId(viewer);
  if (!me) return [];

  const linhas = await prisma.$queryRaw<
    {
      topic_id: string;
      topico_slug: string;
      nome: string;
      comunidade_nome: string;
      comunidade_slug: string;
      pessoas: string;
      respostas: string;
      depois: string;
    }[]
  >`
    WITH minhas AS (
      SELECT a.topic_id, max(a.created_at) AS ultima
        FROM answers a
       WHERE a.author_id = ${me}::uuid AND a.deleted_at IS NULL
       GROUP BY a.topic_id
    )
    SELECT t.id AS topic_id, t.slug AS topico_slug, t.name AS nome,
           c.name AS comunidade_nome, c.slug AS comunidade_slug,
           (SELECT count(DISTINCT a.author_id) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS pessoas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id AND a.deleted_at IS NULL) AS respostas,
           (SELECT count(*) FROM answers a
             WHERE a.topic_id = t.id
               AND a.deleted_at IS NULL
               AND a.created_at > minhas.ultima
               AND a.author_id IS DISTINCT FROM ${me}::uuid) AS depois
      FROM minhas
      JOIN topics t ON t.id = minhas.topic_id AND t.deleted_at IS NULL
      JOIN communities c ON c.id = t.community_id AND c.deleted_at IS NULL
     ORDER BY minhas.ultima DESC
     LIMIT ${LIMITES.minhasInteracoes}
  `;

  return linhas.map((l) => ({
    topicId: l.topic_id,
    topicoSlug: l.topico_slug,
    nome: l.nome,
    comunidade: { nome: l.comunidade_nome, slug: l.comunidade_slug },
    pessoas: Number(l.pessoas),
    respostas: Number(l.respostas),
    depoisDaMinha: Number(l.depois),
  }));
}

/** Se há notificação não lida, para o ponto amarelo no sino. */
export async function temNovidade(viewer: Viewer): Promise<boolean> {
  const me = viewerProfileId(viewer);
  if (!me) return false;

  const achada = await prisma.notification.findFirst({
    where: { profileId: me, readAt: null },
    select: { id: true },
  });
  return achada !== null;
}

/**
 * Marca que a pessoa viu este tópico agora.
 *
 * Só mexe em quem segue: para quem não segue, não há "novas" a zerar, e
 * gravar seria escrita a cada visita sem nada em troca.
 */
export async function marcarTopicoComoVisto(viewer: Viewer, topicId: string): Promise<void> {
  const me = viewerProfileId(viewer);
  if (!me) return;

  await prisma.follow.updateMany({
    where: { followerId: me, topicId, target: "topic" },
    data: { lastSeenAt: new Date() },
  });
}
