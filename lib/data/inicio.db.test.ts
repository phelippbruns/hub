/**
 * O Início (F11): RN19 e os Princípios 1 e 3.
 *
 * O que estes testes protegem são os limites. O Início é a tela que **tem
 * fim** — se alguma seção crescer sem teto, o Princípio 3 vai embora sem
 * ninguém perceber.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  hotTopicsParaMim,
  interacoesDeQuemSigo,
  marcarTopicoComoVisto,
  minhasUltimasInteracoes,
  temNovidade,
  topicosQueSigoComNovas,
} from "./inicio";
import { createCommunity, joinCommunity } from "./communities";
import { createAnswer, createTopic } from "./topics";
import { followProfile, followTopic } from "./follows";
import { virarCiclo } from "./ciclo";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

async function comunidade(nome: string, dona: { id: string }) {
  const universo = await makeUniverse(`Universo ${nome}`);
  const criada = await createCommunity(viewerFor(dona.id), {
    universeId: universo.id,
    name: nome,
    intro: "intro",
    coverUrl: null,
  });
  return db.community.findUniqueOrThrow({ where: { id: criada!.id } });
}

async function topico(quem: { id: string }, communityId: string, nome: string) {
  const criado = await createTopic(viewerFor(quem.id), {
    communityId,
    name: nome,
    description: `Pergunta de ${nome}.`,
    media: null,
  });
  return db.topic.findUniqueOrThrow({ where: { id: criado!.id } });
}

const ONTEM = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

/** Respostas de N pessoas diferentes, num instante escolhido. */
async function responderam(topicId: string, quantas: number, quando: Date) {
  for (let i = 0; i < quantas; i += 1) {
    const quem = await makeProfile();
    await db.answer.create({
      data: { topicId, authorId: quem.id, text: `resposta ${i}`, createdAt: quando },
    });
  }
}

async function diaDoCiclo(quando: Date): Promise<Date> {
  const linhas = await db.$queryRaw<{ dia: Date }[]>`
    SELECT hub_cycle_date(${quando}::timestamptz) AS dia
  `;
  return linhas[0]!.dia;
}

describe("RN19: os Hot Topics são das minhas comunidades", () => {
  it("mostra o destaque de uma comunidade em que estou", async () => {
    const eu = await makeProfile();
    const c = await comunidade("Música", eu);
    const t = await topico(eu, c.id, "primeira festa");

    await responderam(t.id, 3, ONTEM());
    await virarCiclo(await diaDoCiclo(ONTEM()));

    const destaques = await hotTopicsParaMim(viewerFor(eu.id));
    expect(destaques.map((d) => d.topicId)).toEqual([t.id]);
    expect(destaques[0]?.comunidade.nome).toBe("Música");
  });

  it("não mostra o destaque de comunidade alheia", async () => {
    const eu = await makeProfile();
    const outra = await makeProfile();
    const minha = await comunidade("Minha", eu);
    const dela = await comunidade("Dela", outra);

    const meu = await topico(eu, minha.id, "meu assunto");
    const alheio = await topico(outra, dela.id, "assunto dela");
    await responderam(meu.id, 2, ONTEM());
    await responderam(alheio.id, 9, ONTEM());

    await virarCiclo(await diaDoCiclo(ONTEM()));

    // Sem isso o Início mostraria comunidade em que a pessoa nunca entrou.
    const destaques = await hotTopicsParaMim(viewerFor(eu.id));
    expect(destaques.map((d) => d.topicId)).toEqual([meu.id]);
  });

  it("sem ciclo virado, não há destaque nenhum", async () => {
    const eu = await makeProfile();
    const c = await comunidade("Música", eu);
    const t = await topico(eu, c.id, "sem virada");
    await responderam(t.id, 3, ONTEM());

    expect(await hotTopicsParaMim(viewerFor(eu.id))).toEqual([]);
  });
});

describe('o que conta como "nova"', () => {
  async function cenario() {
    const eu = await makeProfile();
    const c = await comunidade("Música", eu);
    const t = await topico(eu, c.id, "assunto seguido");
    await followTopic(viewerFor(eu.id), t.id);
    return { eu, c, t };
  }

  it("conta o que chegou depois que comecei a seguir", async () => {
    const { eu, t } = await cenario();
    await responderam(t.id, 2, new Date());

    const [seguido] = await topicosQueSigoComNovas(viewerFor(eu.id));
    expect(seguido?.novas).toBe(2);
  });

  it("abrir o tópico zera as novas", async () => {
    const { eu, t } = await cenario();
    await responderam(t.id, 2, new Date());

    await marcarTopicoComoVisto(viewerFor(eu.id), t.id);

    // É o que a palavra "nova" promete: zerar quando a pessoa lê.
    const [seguido] = await topicosQueSigoComNovas(viewerFor(eu.id));
    expect(seguido?.novas).toBe(0);
  });

  it("depois de abrir, o que chegar volta a contar", async () => {
    const { eu, t } = await cenario();
    await responderam(t.id, 2, new Date());
    await marcarTopicoComoVisto(viewerFor(eu.id), t.id);

    await responderam(t.id, 1, new Date(Date.now() + 1000));

    const [seguido] = await topicosQueSigoComNovas(viewerFor(eu.id));
    expect(seguido?.novas).toBe(1);
  });

  it("a minha própria resposta não é novidade para mim", async () => {
    const { eu, t } = await cenario();
    await createAnswer(viewerFor(eu.id), { topicId: t.id, text: "respondi eu", media: null });

    const [seguido] = await topicosQueSigoComNovas(viewerFor(eu.id));
    expect(seguido?.novas).toBe(0);
    // Mas ela conta no total do tópico.
    expect(seguido?.respostas).toBe(1);
  });

  it("marcar como visto não mexe em quem não segue", async () => {
    const eu = await makeProfile();
    const outra = await makeProfile();
    const c = await comunidade("Música", eu);
    const t = await topico(eu, c.id, "sem seguir");

    await marcarTopicoComoVisto(viewerFor(outra.id), t.id);

    expect(await db.follow.count({ where: { topicId: t.id } })).toBe(0);
  });
});

describe('"depois da sua" é outra conta', () => {
  it("conta a partir da minha última resposta, não da primeira", async () => {
    const eu = await makeProfile();
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await joinCommunity(viewerFor(eu.id), c.id);
    const t = await topico(dona, c.id, "conversa longa");

    await createAnswer(viewerFor(eu.id), { topicId: t.id, text: "primeira minha", media: null });
    await responderam(t.id, 2, new Date());
    await createAnswer(viewerFor(eu.id), { topicId: t.id, text: "segunda minha", media: null });
    await responderam(t.id, 3, new Date(Date.now() + 1000));

    // Se contasse da primeira, diria 5. A pessoa já leu as duas do meio.
    const [minha] = await minhasUltimasInteracoes(viewerFor(eu.id));
    expect(minha?.depoisDaMinha).toBe(3);
  });

  it("só aparecem tópicos em que eu respondi", async () => {
    const eu = await makeProfile();
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await joinCommunity(viewerFor(eu.id), c.id);

    const respondi = await topico(dona, c.id, "respondi aqui");
    await topico(eu, c.id, "só criei");
    await createAnswer(viewerFor(eu.id), { topicId: respondi.id, text: "oi", media: null });

    const minhas = await minhasUltimasInteracoes(viewerFor(eu.id));
    expect(minhas.map((m) => m.topicId)).toEqual([respondi.id]);
  });
});

describe("Princípio 1: pessoas não definem o Início", () => {
  it("a seção de pessoas nunca passa de 3", async () => {
    const eu = await makeProfile();
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    const t = await topico(dona, c.id, "assunto");

    for (let i = 0; i < 6; i += 1) {
      const quem = await makeProfile();
      await joinCommunity(viewerFor(quem.id), c.id);
      await followProfile(viewerFor(eu.id), quem.id);
      await createAnswer(viewerFor(quem.id), {
        topicId: t.id,
        text: `resposta ${i}`,
        media: null,
      });
    }

    // O teto é regra, não desempenho: o conteúdo de pessoas não pode tomar
    // a tela que é sobre comunidades.
    expect(await interacoesDeQuemSigo(viewerFor(eu.id))).toHaveLength(3);
  });

  it("mostra quem eu sigo, e só", async () => {
    const eu = await makeProfile();
    const seguida = await makeProfile({ name: "Lia Souza" });
    const estranha = await makeProfile({ name: "Outra Pessoa" });
    const c = await comunidade("Música", seguida);
    await joinCommunity(viewerFor(estranha.id), c.id);
    const t = await topico(seguida, c.id, "assunto");

    await followProfile(viewerFor(eu.id), seguida.id);
    await createAnswer(viewerFor(seguida.id), { topicId: t.id, text: "da Lia", media: null });
    await createAnswer(viewerFor(estranha.id), { topicId: t.id, text: "da outra", media: null });

    const interacoes = await interacoesDeQuemSigo(viewerFor(eu.id));
    expect(interacoes.map((i) => i.quem.nome)).toEqual(["Lia Souza", "Lia Souza"]);
  });

  it("distingue quem respondeu de quem criou", async () => {
    const eu = await makeProfile();
    const seguida = await makeProfile();
    const c = await comunidade("Música", seguida);
    await followProfile(viewerFor(eu.id), seguida.id);

    const t = await topico(seguida, c.id, "criei isto");
    await createAnswer(viewerFor(seguida.id), { topicId: t.id, text: "e respondi", media: null });

    const interacoes = await interacoesDeQuemSigo(viewerFor(eu.id));
    expect(interacoes.map((i) => i.oQueFez).sort()).toEqual(["criou", "respondeu"]);
  });

  it("RN26: quem está bloqueado some do Início", async () => {
    const eu = await makeProfile();
    const seguida = await makeProfile();
    const c = await comunidade("Música", seguida);
    const t = await topico(seguida, c.id, "assunto");
    await followProfile(viewerFor(eu.id), seguida.id);
    await createAnswer(viewerFor(seguida.id), { topicId: t.id, text: "oi", media: null });

    expect(await interacoesDeQuemSigo(viewerFor(eu.id))).not.toHaveLength(0);

    await db.block.create({ data: { blockerId: eu.id, blockedId: seguida.id } });
    expect(await interacoesDeQuemSigo(viewerFor(eu.id))).toHaveLength(0);
  });
});

describe("o ponto no sino", () => {
  it("aparece com notificação não lida e some depois", async () => {
    const eu = await makeProfile();

    expect(await temNovidade(viewerFor(eu.id))).toBe(false);

    const aviso = await db.notification.create({
      data: { profileId: eu.id, kind: "topic_became_hot", payload: {} },
    });
    expect(await temNovidade(viewerFor(eu.id))).toBe(true);

    await db.notification.update({ where: { id: aviso.id }, data: { readAt: new Date() } });
    expect(await temNovidade(viewerFor(eu.id))).toBe(false);
  });

  it("é de cada pessoa", async () => {
    const eu = await makeProfile();
    const outra = await makeProfile();
    await db.notification.create({
      data: { profileId: outra.id, kind: "topic_became_hot", payload: {} },
    });

    expect(await temNovidade(viewerFor(eu.id))).toBe(false);
  });
});

describe("quem acabou de chegar", () => {
  it("não tem destaque, nem seguidos, nem interações", async () => {
    const eu = await makeProfile();

    // O estado vazio da tela 7 depende de todas virem vazias.
    expect(await hotTopicsParaMim(viewerFor(eu.id))).toEqual([]);
    expect(await topicosQueSigoComNovas(viewerFor(eu.id))).toEqual([]);
    expect(await interacoesDeQuemSigo(viewerFor(eu.id))).toEqual([]);
    expect(await minhasUltimasInteracoes(viewerFor(eu.id))).toEqual([]);
  });
});
