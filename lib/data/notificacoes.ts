/**
 * Notificações (RN33, RN34 e a marcação com @ da F15).
 *
 * Duas regras valem para tudo aqui:
 *
 * 1. **O conteúdo guarda só ids** (regra de segurança 10). Nome, texto e
 *    email nunca entram no `payload`. Os nomes são resolvidos na hora de
 *    desenhar, com a permissão de quem está olhando.
 *
 * 2. **O interruptor é respeitado na hora de criar**, não na de ler. Gravar
 *    aviso que a pessoa desligou e filtrar depois seria guardar o que
 *    ninguém pediu — e bastaria uma consulta esquecer o filtro para o aviso
 *    aparecer.
 */
import { prisma } from "./prisma";
import { viewerProfileId, requireProfileId, type Viewer } from "./viewer";
import { comAvatares } from "@/lib/midia/deposito";
import { handlesMencionados } from "@/lib/texto/marcacoes";

export type TipoDeNotificacao =
  | "topic_became_hot"
  | "cabin_invite"
  | "cabin_message"
  | "followed_topics_digest"
  | "new_topic_in_community"
  | "mention"
  | "content_removed"
  | "moderation_changed";

type Preferencias = {
  notifyTopicBecameHot: boolean;
  notifyCabin: boolean;
  notifyFollowedTopics: boolean;
  notifyNewTopicInCommunity: boolean;
  notifyMention: boolean;
};

/**
 * A pessoa quer receber este tipo? (RN34)
 *
 * `switch` e não um mapa indexado: ler uma coluna pelo nome em variável tira
 * o tipo do Prisma e acende o aviso de injeção no lint — e os dois estão
 * certos, porque aí ninguém garante que a chave existe.
 */
function querReceber(tipo: TipoDeNotificacao, prefs: Preferencias): boolean {
  switch (tipo) {
    case "topic_became_hot":
      return prefs.notifyTopicBecameHot;
    case "cabin_invite":
    case "cabin_message":
      return prefs.notifyCabin;
    case "followed_topics_digest":
      return prefs.notifyFollowedTopics;
    case "new_topic_in_community":
      return prefs.notifyNewTopicInCommunity;
    case "mention":
      return prefs.notifyMention;
    case "content_removed":
    case "moderation_changed":
      // RN33: o que a moderação faz com você sempre avisa — é obrigação,
      // não opção. Descobrir sozinho que seu conteúdo sumiu, ou que você
      // virou responsável por uma comunidade, é pior do que o aviso.
      return true;
  }
}

/**
 * Cria a notificação, se a pessoa quiser receber aquele tipo.
 *
 * Devolve se criou, porque os testes precisam distinguir "não criou porque
 * está desligado" de "criou e o teste não achou".
 *
 * Ninguém é avisado do que fez: quem responde não recebe aviso da própria
 * resposta, e quem marca não se marca.
 */
export async function avisar(
  profileId: string,
  tipo: TipoDeNotificacao,
  payload: Record<string, string>,
  quemFez?: string | null,
): Promise<boolean> {
  if (quemFez && quemFez === profileId) return false;

  const perfil = await prisma.profile.findUnique({
    where: { id: profileId },
    select: {
      deletedAt: true,
      notifyTopicBecameHot: true,
      notifyCabin: true,
      notifyFollowedTopics: true,
      notifyNewTopicInCommunity: true,
      notifyMention: true,
    },
  });

  if (!perfil || perfil.deletedAt) return false;
  if (!querReceber(tipo, perfil)) return false;

  await prisma.notification.create({ data: { profileId, kind: tipo, payload } });
  return true;
}

export type NotificacaoNaTela = {
  id: string;
  tipo: TipoDeNotificacao;
  texto: string;
  href: string | null;
  /** Pede ação ou é pessoal: vai para o topo, destacada (tela 8). */
  pessoal: boolean;
  lida: boolean;
  quando: Date;
  autor: { nome: string; handle: string; avatarUrl: string | null } | null;
};

/** Até onde a central mostra. A lista termina, como tudo no Hub. */
const LIMITE = 50;

/**
 * A central (tela 8): o que chegou, em ordem, com os ids já resolvidos.
 *
 * Resolver aqui, e não guardar o nome no `payload`, é o que mantém a regra
 * de segurança 10 de pé — e é o que faz o nome aparecer **atual**, em vez
 * de congelado no dia do aviso.
 */
export async function listarNotificacoes(viewer: Viewer): Promise<NotificacaoNaTela[]> {
  const me = viewerProfileId(viewer);
  if (!me) return [];

  const linhas = await prisma.notification.findMany({
    where: { profileId: me },
    orderBy: { createdAt: "desc" },
    take: LIMITE,
  });

  if (linhas.length === 0) return [];

  /*
   * O payload junto da linha, e não em duas listas casadas por índice: ler
   * `payloads[i]` dentro do `map` é índice dinâmico, que o lint acusa com
   * razão — nada garante que as duas listas andem no mesmo passo.
   */
  const comDados = linhas.map((linha) => ({
    linha,
    dados: linha.payload as Record<string, string>,
  }));
  const payloads = comDados.map((item) => item.dados);

  const [topicos, comunidades, pessoas] = await Promise.all([
    carregarTopicos(payloads),
    carregarComunidades(payloads),
    carregarPessoas(payloads),
  ]);

  return comDados.map(({ linha, dados }) => {
    const topico = dados.topicId ? topicos.get(dados.topicId) : undefined;
    const comunidade = dados.communityId ? comunidades.get(dados.communityId) : undefined;
    const quem = dados.autorId ? pessoas.get(dados.autorId) : undefined;

    return {
      id: linha.id,
      tipo: linha.kind as TipoDeNotificacao,
      texto: textoDe(linha.kind as TipoDeNotificacao, { topico, comunidade, quem, dados }),
      href: destinoDe(linha.kind as TipoDeNotificacao, { topico, comunidade, dados }),
      pessoal: EH_PESSOAL.has(linha.kind as TipoDeNotificacao),
      lida: linha.readAt !== null,
      quando: linha.createdAt,
      autor: quem ? { nome: quem.name, handle: quem.handle, avatarUrl: quem.avatarUrl } : null,
    };
  });
}

/**
 * As que pedem ação ou são pessoais (tela 8).
 *
 * "Pessoal" não é sobre importância: é sobre haver **alguém do outro lado**
 * esperando. Um convite sem resposta e uma marcação sem retorno deixam uma
 * conversa pendurada; um Hot Topic, não.
 */
const EH_PESSOAL = new Set<TipoDeNotificacao>([
  "cabin_invite",
  "cabin_message",
  "mention",
  "content_removed",
  "moderation_changed",
]);

type Resolvidos = {
  topico?: { name: string; slug: string; community: { slug: string } };
  comunidade?: { name: string; slug: string };
  quem?: { name: string; handle: string; avatarUrl: string | null };
  dados: Record<string, string>;
};

function textoDe(tipo: TipoDeNotificacao, { topico, comunidade, quem, dados }: Resolvidos): string {
  const nomeDoTopico = topico?.name ?? "um tópico";
  const nomeDaComunidade = comunidade?.name ?? "uma comunidade";
  const nomeDeQuem = quem?.name ?? "Alguém";

  switch (tipo) {
    case "topic_became_hot":
      return `Seu tópico "${nomeDoTopico}" virou Hot Topic em ${nomeDaComunidade}.`;
    case "cabin_invite":
      return `${nomeDeQuem} quer conversar com você numa Cabine.`;
    case "cabin_message":
      return `${nomeDeQuem} mandou uma mensagem na Cabine.`;
    case "mention":
      return `${nomeDeQuem} marcou você em "${nomeDoTopico}".`;
    case "new_topic_in_community":
      return `Novo tópico em ${nomeDaComunidade}: "${nomeDoTopico}".`;
    case "content_removed": {
      // Dizer **o que** sumiu, e não "seu conteúdo": quem recebe precisa
      // saber se perdeu a resposta de hoje ou o tópico que abriu na semana
      // passada, senão vai procurar os dois.
      const oQue =
        dados.tipo === "topic"
          ? "Seu tópico foi removido"
          : dados.tipo === "answer"
            ? "Sua resposta foi removida"
            : "Algo seu foi removido";
      return `${oQue} de ${nomeDaComunidade}${
        dados.motivo ? `: ${dados.motivo.toLowerCase()}.` : "."
      }`;
    }
    case "moderation_changed":
      return dados.convite === "sim"
        ? `Você foi convidado para moderar ${nomeDaComunidade}.`
        : `Você não modera mais ${nomeDaComunidade}. Continua membro.`;
    case "followed_topics_digest": {
      const quantas = Number(dados.respostas ?? 0);
      const topicos = Number(dados.topicos ?? 0);
      return `${quantas} ${quantas === 1 ? "resposta nova" : "respostas novas"} em ${topicos} ${
        topicos === 1 ? "tópico que você segue" : "tópicos que você segue"
      }.`;
    }
  }
}

function destinoDe(
  tipo: TipoDeNotificacao,
  { topico, comunidade, dados }: Omit<Resolvidos, "quem">,
): string | null {
  if (tipo === "cabin_invite")
    return dados.inviteId ? `/cabines/convite?id=${dados.inviteId}` : "/cabines";
  if (tipo === "cabin_message") return dados.cabinId ? `/cabines/${dados.cabinId}` : "/cabines";
  if (tipo === "followed_topics_digest") return "/inicio";
  if (topico) return `/c/${topico.community.slug}/${topico.slug}`;
  if (comunidade) return `/c/${comunidade.slug}`;
  return null;
}

async function carregarTopicos(payloads: Record<string, string>[]) {
  const ids = [...new Set(payloads.flatMap((p) => (p.topicId ? [p.topicId] : [])))];
  if (ids.length === 0) return new Map<string, Resolvidos["topico"]>();

  const achados = await prisma.topic.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, name: true, slug: true, community: { select: { slug: true } } },
  });
  return new Map(achados.map((t) => [t.id, t]));
}

async function carregarComunidades(payloads: Record<string, string>[]) {
  const ids = [...new Set(payloads.flatMap((p) => (p.communityId ? [p.communityId] : [])))];
  if (ids.length === 0) return new Map<string, Resolvidos["comunidade"]>();

  const achadas = await prisma.community.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, name: true, slug: true },
  });
  return new Map(achadas.map((c) => [c.id, c]));
}

async function carregarPessoas(payloads: Record<string, string>[]) {
  const ids = [...new Set(payloads.flatMap((p) => (p.autorId ? [p.autorId] : [])))];
  if (ids.length === 0) return new Map<string, Resolvidos["quem"]>();

  const achadas = await prisma.profile.findMany({
    where: { id: { in: ids }, deletedAt: null },
    select: { id: true, name: true, handle: true, avatarUrl: true },
  });

  // A foto vem como caminho no depósito; a tela precisa de endereço.
  const comFoto = await comAvatares(achadas);
  return new Map(
    achadas.map((p, i) => [p.id, { ...p, avatarUrl: comFoto.at(i)?.avatarUrl ?? null }]),
  );
}

/**
 * Marca tudo como lido.
 *
 * Abrir a central é a confirmação de que a pessoa viu — e é o que apaga o
 * ponto do sino, que até agora nunca apagava porque não havia onde ler.
 */
export async function marcarNotificacoesComoLidas(viewer: Viewer): Promise<void> {
  const me = requireProfileId(viewer);
  await prisma.notification.updateMany({
    where: { profileId: me, readAt: null },
    data: { readAt: new Date() },
  });
}

/**
 * Avisa quem foi marcado com @ num texto (F15).
 *
 * **Marcar é convite, não intromissão.** Numa rede sem curtida, ser
 * arrastado para uma conversa por qualquer pessoa é um jeito fácil de
 * incomodar — por isso só vale entre membros da mesma comunidade, e o
 * bloqueio vale nos dois sentidos (RN26). Marcar quem está de fora não
 * avisa ninguém e não deixa rastro.
 *
 * Os perfis são resolvidos **agora**, e não na hora de ler: o aviso não
 * pode depender de reler o texto depois, que mudaria de sentido se a pessoa
 * trocasse de @.
 */
export async function avisarMarcados({
  texto,
  autorId,
  communityId,
  topicId,
}: {
  texto: string;
  autorId: string;
  communityId: string;
  topicId: string;
}): Promise<string[]> {
  const handles = handlesMencionados(texto);
  if (handles.length === 0) return [];

  const marcados = await prisma.profile.findMany({
    where: {
      handle: { in: handles },
      deletedAt: null,
      id: { not: autorId },
      // Item 7: só quem é membro da mesma comunidade.
      memberships: { some: { communityId, bannedAt: null } },
      // RN26: bloqueio esconde nos dois sentidos.
      NOT: {
        OR: [
          { blocksReceived: { some: { blockerId: autorId } } },
          { blocksMade: { some: { blockedId: autorId } } },
        ],
      },
    },
    select: { id: true },
  });

  const avisados: string[] = [];
  for (const pessoa of marcados) {
    if (await avisar(pessoa.id, "mention", { topicId, communityId, autorId }, autorId)) {
      avisados.push(pessoa.id);
    }
  }

  return avisados;
}

/** Quais destes @ existem, para a tela saber o que vira link. */
export async function handlesQueExistem(handles: string[]): Promise<Set<string>> {
  if (handles.length === 0) return new Set();

  const achados = await prisma.profile.findMany({
    where: { handle: { in: handles }, deletedAt: null },
    select: { handle: true },
  });
  return new Set(achados.map((p) => p.handle));
}
