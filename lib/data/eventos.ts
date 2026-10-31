/**
 * Eventos da comunidade (RN38).
 *
 * **A regra principal desta camada: o link da sala só sai para quem
 * confirmou presença.**
 *
 * Um endereço de sala aberta na página de uma comunidade pública é um
 * convite para quem a comunidade não chamou — e o encontro de quinze
 * pessoas vira outro. Por isso `linkDoEncontro` é `null` para os demais, e
 * não escondido na tela: o que não pode ser visto não é enviado.
 */
import { prisma } from "./prisma";
import { ForbiddenError, NotFoundError } from "./errors";
import { requireProfileId, viewerProfileId, type Viewer } from "./viewer";
import { requireActiveMembership } from "./access";
import { criarEventoSchema } from "./validation";
import { comAvatares } from "@/lib/midia/deposito";

/** Quem pode criar evento: qualquer membro, como nas enquetes. */
export async function podeCriarEvento(profileId: string, communityId: string): Promise<void> {
  await requireActiveMembership(profileId, communityId);
}

export type EventoNaTela = {
  id: string;
  titulo: string;
  descricao: string;
  formato: "online" | "presencial";
  comeca: Date;
  /** Vazio quando online. */
  local: string;
  anfitriao: { name: string; handle: string } | null;
  confirmados: number;
  vagas: number | null;
  /** Já passou: entra em "Anteriores" e não aceita mais confirmação. */
  passou: boolean;
  euVou: boolean;
  /** Sem vaga e eu não estou dentro. */
  lotado: boolean;
  /**
   * A sala do encontro online, **só para quem confirmou**. Nulo para todos
   * os demais, inclusive para quem organiza e não confirmou a própria
   * presença — que é um caso raro e um descuido fácil de desfazer.
   */
  linkDoEncontro: string | null;
  /** As primeiras caras de quem vai, para a linha de confirmados. */
  primeiros: { nome: string; avatarUrl: string | null }[];
};

/** Os eventos de uma comunidade: os próximos primeiro, depois os passados. */
export async function eventosDaComunidade(
  viewer: Viewer,
  communityId: string,
): Promise<EventoNaTela[]> {
  const me = viewerProfileId(viewer);
  const agora = new Date();

  const eventos = await prisma.event.findMany({
    where: { communityId, deletedAt: null },
    orderBy: [{ startsAt: "asc" }],
    select: {
      id: true,
      title: true,
      description: true,
      format: true,
      startsAt: true,
      place: true,
      joinUrl: true,
      capacity: true,
      host: { select: { name: true, handle: true } },
      _count: { select: { attendances: true } },
      // Só a minha presença por linha; as outras vêm agregadas abaixo.
      attendances: me ? { where: { profileId: me }, select: { profileId: true } } : false,
    },
  });

  if (eventos.length === 0) return [];

  // As primeiras caras de cada evento, numa consulta só.
  const presencas = await prisma.eventAttendance.findMany({
    where: { eventId: { in: eventos.map((e) => e.id) } },
    orderBy: { confirmedAt: "asc" },
    select: { eventId: true, profile: { select: { name: true, avatarUrl: true } } },
  });
  const assinados = await comAvatares(presencas.map((p) => p.profile));

  const porEvento = new Map<string, { nome: string; avatarUrl: string | null }[]>();
  presencas.forEach((presenca, i) => {
    const lista = porEvento.get(presenca.eventId) ?? [];
    if (lista.length < 4) {
      lista.push({
        nome: presenca.profile.name,
        avatarUrl: assinados.at(i)?.avatarUrl ?? null,
      });
    }
    porEvento.set(presenca.eventId, lista);
  });

  return eventos.map((evento) => {
    const euVou = (evento.attendances?.length ?? 0) > 0;
    const confirmados = evento._count.attendances;
    const passou = evento.startsAt <= agora;

    return {
      id: evento.id,
      titulo: evento.title,
      descricao: evento.description,
      formato: evento.format,
      comeca: evento.startsAt,
      local: evento.place,
      anfitriao: evento.host,
      confirmados,
      vagas: evento.capacity,
      passou,
      euVou,
      lotado: evento.capacity !== null && confirmados >= evento.capacity && !euVou,
      // A regra inteira desta camada, numa linha.
      linkDoEncontro: euVou ? evento.joinUrl : null,
      primeiros: porEvento.get(evento.id) ?? [],
    };
  });
}

/** Quantos encontros ainda vão acontecer — o contador da aba. */
export async function eventosFuturos(_viewer: Viewer, communityId: string): Promise<number> {
  return prisma.event.count({
    where: { communityId, deletedAt: null, startsAt: { gt: new Date() } },
  });
}

/** Cria o encontro. A data no futuro e o local são conferidos no Zod. */
export async function criarEvento(viewer: Viewer, entrada: unknown) {
  const me = requireProfileId(viewer);
  const dados = criarEventoSchema.parse(entrada);
  await podeCriarEvento(me, dados.communityId);

  return prisma.event.create({
    data: {
      communityId: dados.communityId,
      hostId: me,
      title: dados.titulo,
      description: dados.descricao,
      format: dados.formato,
      startsAt: dados.comeca,
      place: dados.formato === "presencial" ? dados.local : "",
      joinUrl: dados.formato === "online" ? (dados.linkDoEncontro ?? null) : null,
      capacity: dados.vagas,
    },
    select: { id: true },
  });
}

/**
 * Confirma a presença.
 *
 * O teto de vagas é conferido **aqui**, e não no banco: um CHECK não conta
 * linhas de outra tabela. Duas pessoas confirmando na última vaga ao mesmo
 * tempo podem passar as duas — é uma vaga a mais num encontro, que quem
 * organiza resolve, e o preço de evitar seria serializar toda confirmação.
 * Decisão registrada, não descuido.
 */
export async function confirmarPresenca(viewer: Viewer, eventId: string): Promise<void> {
  const me = requireProfileId(viewer);

  const evento = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: {
      communityId: true,
      startsAt: true,
      capacity: true,
      _count: { select: { attendances: true } },
      attendances: { where: { profileId: me }, select: { profileId: true } },
    },
  });
  if (!evento) throw new NotFoundError("Evento");

  await requireActiveMembership(me, evento.communityId);

  /*
   * O que já aconteceu não aceita nada — **antes** de qualquer outra
   * conferência. Na primeira versão a saída de "já está dentro" vinha
   * primeiro, e um encontro passado respondia "pronto" a quem tentasse
   * confirmar de novo. Encontro no passado é fato encerrado.
   */
  if (evento.startsAt <= new Date()) {
    throw new ForbiddenError("Este encontro já aconteceu");
  }

  // Já está dentro: confirmar de novo não faz nada, e não é erro.
  if (evento.attendances.length > 0) return;
  if (evento.capacity !== null && evento._count.attendances >= evento.capacity) {
    throw new ForbiddenError("Este encontro está lotado");
  }

  await prisma.eventAttendance.create({ data: { eventId, profileId: me } });
}

/** Cancela a presença, liberando a vaga. */
export async function cancelarPresenca(viewer: Viewer, eventId: string): Promise<void> {
  const me = requireProfileId(viewer);

  const evento = await prisma.event.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { startsAt: true },
  });
  if (!evento) throw new NotFoundError("Evento");
  if (evento.startsAt <= new Date()) {
    throw new ForbiddenError("Este encontro já aconteceu");
  }

  await prisma.eventAttendance.deleteMany({ where: { eventId, profileId: me } });
}
