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
import type { Enquadramento } from "@/lib/midia/enquadramento";

export type LinkDoPerfil = { title: string; url: string };

export type PerfilNaTela = {
  id: string;
  handle: string;
  name: string;
  bio: string | null;
  avatarUrl: string | null;
  /** RN30: como a foto é recortada dentro da forma. */
  enquadramento: Enquadramento;
  /** Medidas da imagem original, para a conta do recorte. `null` sem foto. */
  medidasDaFoto: { largura: number; altura: number } | null;
  /** RN27: a chave da cor de fundo. A tela traduz para o token. */
  backgroundKey: string;
  /** RN16/RN27: o único lugar do Hub com link. Até 3, na ordem. */
  links: LinkDoPerfil[];
  souEu: boolean;
  /**
   * RN27/RN28: número, nunca lista — e `null` quando a pessoa escondeu.
   *
   * Nulo é diferente de zero de propósito: zero diria "ninguém segue", e
   * mandar o número para a tela escondê-lo deixaria o valor no HTML para
   * quem soubesse olhar.
   */
  seguidores: number | null;
  /** RN27: só no perfil próprio. `null` para visitante. */
  seguindo: number | null;
  /** O dono precisa saber que escondeu, para a tela poder dizer. */
  escondeSeguidores: boolean;
  /** RN28: respostas **mais** tópicos criados. */
  contribuicoes: number;
  comunidades: number;
  /** Como quem olha se relaciona com esta pessoa. */
  euSigo: boolean;
  euBloqueei: boolean;
  euSilenciei: boolean;
  /** RN21: já existe um convite meu de Cabine esperando resposta dela. */
  convitePendente: boolean;
};

/**
 * RN28: contribuição é resposta **ou** tópico criado.
 *
 * É a mesma soma que a aba Contribuições lista, e tem de ser — um número
 * que não bate com a lista embaixo dele é pior do que número nenhum. Os
 * dois saem de `answers UNION ALL topics` com os mesmos filtros.
 *
 * O indicador "dias ativos" morava aqui e saiu: ele media assiduidade, que
 * é o oposto do que o Hub promete (participar no seu tempo).
 */
async function contarContribuicoes(profileId: string): Promise<number> {
  const linhas = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT (
      (SELECT count(*) FROM answers
        WHERE author_id = ${profileId}::uuid AND deleted_at IS NULL) +
      (SELECT count(*) FROM topics
        WHERE author_id = ${profileId}::uuid AND deleted_at IS NULL)
    )::bigint AS total
  `;
  return Number(linhas[0]?.total ?? 0);
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
    select: {
      id: true,
      handle: true,
      name: true,
      bio: true,
      avatarUrl: true,
      avatarWidth: true,
      avatarHeight: true,
      avatarZoom: true,
      avatarOffsetX: true,
      avatarOffsetY: true,
      backgroundKey: true,
      hideFollowers: true,
      links: { select: { title: true, url: true }, orderBy: { position: "asc" } },
    },
  });
  if (!perfil) throw new NotFoundError("Perfil");

  const me = viewerProfileId(viewer);
  const souEu = me === perfil.id;

  /*
   * RN27: com o interruptor ligado, o visitante não recebe os números — a
   * consulta nem acontece. Esconder só na tela deixaria o valor no HTML.
   */
  const mostraNumeros = souEu || !perfil.hideFollowers;

  const [seguidores, contribuicoes, comunidades, seguindo, relacao] = await Promise.all([
    mostraNumeros
      ? prisma.follow.count({ where: { followedProfileId: perfil.id } })
      : Promise.resolve(null),
    contarContribuicoes(perfil.id),
    prisma.membership.count({ where: { profileId: perfil.id, bannedAt: null } }),
    souEu
      ? prisma.follow.count({ where: { followerId: perfil.id, target: "profile" } })
      : Promise.resolve(null),
    me && !souEu ? relacaoCom(me, perfil.id) : Promise.resolve(null),
  ]);

  return {
    id: perfil.id,
    handle: perfil.handle,
    name: perfil.name,
    bio: perfil.bio,
    avatarUrl: await enderecoDeMidia(perfil.avatarUrl),
    enquadramento: {
      zoom: perfil.avatarZoom,
      ox: perfil.avatarOffsetX,
      oy: perfil.avatarOffsetY,
    },
    medidasDaFoto:
      perfil.avatarWidth && perfil.avatarHeight
        ? { largura: perfil.avatarWidth, altura: perfil.avatarHeight }
        : null,
    backgroundKey: perfil.backgroundKey,
    links: perfil.links,
    souEu,
    seguidores,
    seguindo,
    escondeSeguidores: perfil.hideFollowers,
    contribuicoes,
    comunidades,
    euSigo: relacao?.sigo ?? false,
    euBloqueei: relacao?.bloqueei ?? false,
    euSilenciei: relacao?.silenciei ?? false,
    convitePendente: relacao?.convitePendente ?? false,
  };
}

async function relacaoCom(me: string, outra: string) {
  const [sigo, bloqueei, silenciei, convite] = await Promise.all([
    prisma.follow.findFirst({ where: { followerId: me, followedProfileId: outra } }),
    prisma.block.findUnique({
      where: { blockerId_blockedId: { blockerId: me, blockedId: outra } },
    }),
    prisma.mute.findUnique({ where: { muterId_mutedId: { muterId: me, mutedId: outra } } }),
    /*
     * RN21: um convite pendente por pessoa. Saber que existe é o que deixa
     * o botão de Cabine dizer "esperando" em vez de convidar de novo e
     * esbarrar na trava do banco sem explicar o porquê.
     */
    prisma.cabinInvite.findFirst({
      where: { inviterId: me, inviteeId: outra, status: "pending" },
      select: { id: true },
    }),
  ]);

  return {
    sigo: sigo !== null,
    bloqueei: bloqueei !== null,
    silenciei: silenciei !== null,
    convitePendente: convite !== null,
  };
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
  /** RN27: tópico com ao menos uma resposta nas últimas 24 horas. */
  topicosAtivos: number;
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
      topicos_ativos: number;
    }[]
  >`
    SELECT c.id, c.slug, c.name AS nome, c.members_count AS membros, c.cover_url,
           EXISTS (
             SELECT 1 FROM memberships minha
              WHERE minha.community_id = c.id
                AND minha.profile_id = ${me}::uuid
                AND minha.banned_at IS NULL
           ) AS em_comum,
           -- RN27: tópico ativo é o que recebeu resposta nas últimas 24 h.
           -- Janela corrida, e não "hoje": às 00h05 o dia do ciclo vira e
           -- uma comunidade movimentada a noite toda apareceria parada.
           (
             SELECT count(DISTINCT t.id)
               FROM topics t
               JOIN answers a ON a.topic_id = t.id AND a.deleted_at IS NULL
              WHERE t.community_id = c.id
                AND t.deleted_at IS NULL
                AND a.created_at > now() - interval '24 hours'
           )::int AS topicos_ativos
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
    topicosAtivos: l.topicos_ativos,
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
