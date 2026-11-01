/**
 * O ciclo do Hot Topic (F10): RN09, RN10 e RN11.
 *
 * É a feature que dá ao Hub um motivo para alguém voltar amanhã, e a única
 * que ninguém consegue conferir olhando a tela — ela acontece à meia-noite,
 * sozinha. Estes testes são a prova.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import { hotTopicDeHoje, posicaoDoMeuTopico, virarCiclo, virarCicloPendente } from "./ciclo";
import { createCommunity, joinCommunity } from "./communities";
import { minhasComunidades } from "./comunidades";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

/** O dia do ciclo a que um instante pertence, como o banco calcula. */
async function diaDoCiclo(quando: Date = new Date()): Promise<string> {
  const linhas = await db.$queryRaw<{ dia: Date }[]>`
    SELECT hub_cycle_date(${quando}::timestamptz) AS dia
  `;
  return linhas[0]!.dia.toISOString().slice(0, 10);
}

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

/**
 * Um tópico com respostas de N pessoas diferentes, num instante escolhido.
 *
 * Escreve direto no banco porque o cenário precisa de datas no passado, e
 * nenhum caminho do produto deixa escolher quando uma resposta aconteceu.
 */
async function topicoCom(
  communityId: string,
  nome: string,
  opcoes: { pessoas: number; quando: Date; autor?: { id: string }; criadoEm?: Date },
) {
  const autor = opcoes.autor ?? (await makeProfile());
  const topico = await db.topic.create({
    data: {
      communityId,
      authorId: autor.id,
      name: nome,
      description: "abertura",
      cycleDate: new Date(),
      ...(opcoes.criadoEm ? { createdAt: opcoes.criadoEm } : {}),
    },
  });

  for (let i = 0; i < opcoes.pessoas; i += 1) {
    const quem = await makeProfile();
    await db.answer.create({
      data: {
        topicId: topico.id,
        authorId: quem.id,
        text: `resposta ${i}`,
        createdAt: opcoes.quando,
      },
    });
  }

  return { topico, autor };
}

const ONTEM = () => new Date(Date.now() - 24 * 60 * 60 * 1000);

describe("RN09: vence quem reuniu mais pessoas", () => {
  it("conta pessoas diferentes, não respostas", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);

    const { topico: poucos } = await topicoCom(c.id, "poucas pessoas", {
      pessoas: 2,
      quando: ONTEM(),
    });
    const { topico: muitos } = await topicoCom(c.id, "muitas pessoas", {
      pessoas: 4,
      quando: ONTEM(),
    });

    // A pessoa sozinha responde dez vezes no tópico com menos gente.
    const insistente = await makeProfile();
    for (let i = 0; i < 10; i += 1) {
      await db.answer.create({
        data: {
          topicId: poucos.id,
          authorId: insistente.id,
          text: `insisti ${i}`,
          createdAt: ONTEM(),
        },
      });
    }

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));

    // Se contasse respostas, o tópico de 12 respostas venceria o de 4.
    const vencedor = await hotTopicDeHoje(c.id);
    expect(vencedor?.id).toBe(muitos.id);
    expect(vencedor?.pessoasQueElegeram).toBe(4);
  });

  it("respostas de hoje não decidem o ciclo de ontem", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);

    const { topico: ontem } = await topicoCom(c.id, "movimentado ontem", {
      pessoas: 2,
      quando: ONTEM(),
    });
    await topicoCom(c.id, "movimentado hoje", { pessoas: 9, quando: new Date() });

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));

    expect((await hotTopicDeHoje(c.id))?.id).toBe(ontem.id);
  });

  it("resposta apagada não conta", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);

    const { topico: campeao } = await topicoCom(c.id, "com apagadas", {
      pessoas: 3,
      quando: ONTEM(),
    });
    await topicoCom(c.id, "limpo", { pessoas: 2, quando: ONTEM() });

    await db.answer.updateMany({
      where: { topicId: campeao.id },
      data: { deletedAt: new Date() },
    });

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));

    expect((await hotTopicDeHoje(c.id))?.name).toBe("limpo");
  });
});

describe("RN10: o destaque não se perpetua", () => {
  it("o vencedor de ontem não vence hoje, mesmo com mais gente", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    const ontem = await diaDoCiclo(ONTEM());

    const { topico: campeao } = await topicoCom(c.id, "o de sempre", {
      pessoas: 8,
      quando: ONTEM(),
    });
    const { topico: segundo } = await topicoCom(c.id, "o outro", {
      pessoas: 3,
      quando: ONTEM(),
    });

    // Ele já era o Hot Topic enquanto as respostas chegavam — e é por isso
    // que recebeu tantas: estar no topo rende estar no topo.
    await db.hotTopic.create({
      data: {
        communityId: c.id,
        cycleDate: new Date(ontem),
        topicId: campeao.id,
        distinctRespondents: 5,
      },
    });

    await virarCiclo(new Date(ontem));

    expect((await hotTopicDeHoje(c.id))?.id).toBe(segundo.id);
  });

  it("com só um tópico, que já venceu, a comunidade fica sem destaque", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    const ontem = await diaDoCiclo(ONTEM());

    const { topico } = await topicoCom(c.id, "único", { pessoas: 4, quando: ONTEM() });
    await db.hotTopic.create({
      data: {
        communityId: c.id,
        cycleDate: new Date(ontem),
        topicId: topico.id,
        distinctRespondents: 4,
      },
    });

    await virarCiclo(new Date(ontem));

    // Melhor sem destaque do que repetindo o mesmo para sempre.
    expect(await hotTopicDeHoje(c.id)).toBeNull();
  });
});

describe("o desempate", () => {
  it("empatados, vence o tópico mais antigo", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);

    const antes = new Date(Date.now() - 72 * 60 * 60 * 1000);
    const depois = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const { topico: velho } = await topicoCom(c.id, "abriu primeiro", {
      pessoas: 3,
      quando: ONTEM(),
      criadoEm: antes,
    });
    await topicoCom(c.id, "abriu depois", {
      pessoas: 3,
      quando: ONTEM(),
      criadoEm: depois,
    });

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));

    // Precisa ser alguma regra fixa: sem ela o resultado mudaria a cada
    // execução, e o Hot Topic viraria sorteio.
    expect((await hotTopicDeHoje(c.id))?.id).toBe(velho.id);
  });
});

describe("comunidade parada", () => {
  it("sem respostas no ciclo, não ganha Hot Topic", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await topicoCom(c.id, "ninguém respondeu", { pessoas: 0, quando: ONTEM() });

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));

    expect(await hotTopicDeHoje(c.id)).toBeNull();
  });

  it("uma comunidade parada não atrapalha a outra", async () => {
    const dona = await makeProfile();
    const parada = await comunidade("Parada", dona);
    const viva = await comunidade("Viva", dona);

    await topicoCom(parada.id, "silêncio", { pessoas: 0, quando: ONTEM() });
    const { topico } = await topicoCom(viva.id, "conversa", { pessoas: 2, quando: ONTEM() });

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));

    expect(await hotTopicDeHoje(parada.id)).toBeNull();
    expect((await hotTopicDeHoje(viva.id))?.id).toBe(topico.id);
  });
});

describe("rodar de novo é seguro", () => {
  it("duas vezes no mesmo dia não muda nada", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    const ontem = new Date(await diaDoCiclo(ONTEM()));

    const { topico } = await topicoCom(c.id, "primeiro", { pessoas: 3, quando: ONTEM() });

    expect(await virarCiclo(ontem)).toBe(1);
    // A segunda execução não elege ninguém: já está eleito.
    expect(await virarCiclo(ontem)).toBe(0);
    expect((await hotTopicDeHoje(c.id))?.id).toBe(topico.id);
  });

  it("o agendamento não refaz o que já foi feito", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await topicoCom(c.id, "do dia", { pessoas: 2, quando: ONTEM() });

    expect(await virarCicloPendente()).toBe(1);
    expect(await virarCicloPendente()).toBe(0);
  });

  it("um dia perdido é recuperado na execução seguinte", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await topicoCom(c.id, "de ontem", { pessoas: 2, quando: ONTEM() });

    /*
     * É o motivo de o agendamento ser de hora em hora: se o banco estiver
     * indisponível à meia-noite, um agendamento único pularia o dia inteiro
     * em silêncio.
     */
    expect(await virarCicloPendente()).toBe(1);
    expect(await hotTopicDeHoje(c.id)).not.toBeNull();
  });
});

describe("RN11: tópico ativo é o das últimas 24 horas", () => {
  it("resposta de 23 horas atrás conta; de 25, não", async () => {
    const eu = await makeProfile();
    const c = await comunidade("Música", eu);

    await topicoCom(c.id, "recente", {
      pessoas: 1,
      quando: new Date(Date.now() - 23 * 60 * 60 * 1000),
    });

    const [antes] = await minhasComunidades(viewerFor(eu.id));
    expect(antes?.topicosAtivos).toBe(1);

    await db.answer.updateMany({
      data: { createdAt: new Date(Date.now() - 25 * 60 * 60 * 1000) },
    });

    const [depois] = await minhasComunidades(viewerFor(eu.id));
    expect(depois?.topicosAtivos).toBe(0);
  });

  it("logo depois da meia-noite, o que rolou à noite continua ativo", async () => {
    const eu = await makeProfile();
    const c = await comunidade("Música", eu);

    /*
     * Era aqui que a implementação antiga errava: contando só o ciclo de
     * hoje, às 00h05 um tópico movimentado a noite inteira aparecia morto.
     */
    await topicoCom(c.id, "a noite toda", {
      pessoas: 2,
      quando: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    const [minha] = await minhasComunidades(viewerFor(eu.id));
    expect(minha?.topicosAtivos).toBe(1);
  });
});

describe("a posição do meu tópico na disputa de hoje", () => {
  it("diz em que lugar está", async () => {
    const eu = await makeProfile();
    const c = await comunidade("Música", eu);

    await topicoCom(c.id, "líder", { pessoas: 5, quando: new Date() });
    await topicoCom(c.id, "o meu", { pessoas: 3, quando: new Date(), autor: eu });

    const minha = await posicaoDoMeuTopico(viewerFor(eu.id), c.id);
    expect(minha?.posicao).toBe(2);
    expect(minha?.name).toBe("o meu");
    expect(minha?.pessoas).toBe(3);
  });

  it("fora do pódio, não diz nada", async () => {
    const eu = await makeProfile();
    const c = await comunidade("Música", eu);

    for (const n of [9, 8, 7]) {
      await topicoCom(c.id, `outro ${n}`, { pessoas: n, quando: new Date() });
    }
    await topicoCom(c.id, "o meu", { pessoas: 1, quando: new Date(), autor: eu });

    // A linha serve para dizer "está perto", não para informar que você é o
    // décimo quarto.
    expect(await posicaoDoMeuTopico(viewerFor(eu.id), c.id)).toBeNull();
  });

  it("sem tópico meu na disputa, não diz nada", async () => {
    const eu = await makeProfile();
    const c = await comunidade("Música", eu);
    await topicoCom(c.id, "de outra pessoa", { pessoas: 2, quando: new Date() });

    expect(await posicaoDoMeuTopico(viewerFor(eu.id), c.id)).toBeNull();
  });
});

describe("o aviso de que o tópico virou Hot Topic", () => {
  it("o autor recebe o registro da notificação", async () => {
    const dona = await makeProfile();
    const autora = await makeProfile();
    const c = await comunidade("Música", dona);
    await joinCommunity(viewerFor(autora.id), c.id);

    const { topico } = await topicoCom(c.id, "o eleito", {
      pessoas: 3,
      quando: ONTEM(),
      autor: autora,
    });

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));

    const avisos = await db.notification.findMany({
      where: { profileId: autora.id, kind: "topic_became_hot" },
    });
    expect(avisos).toHaveLength(1);
    // Só ids, nunca nome nem texto (regra de segurança 10).
    expect(avisos[0]?.payload).toMatchObject({ topicId: topico.id, communityId: c.id });
  });

  it("rodar de novo não avisa duas vezes", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    const ontem = new Date(await diaDoCiclo(ONTEM()));
    const { autor } = await topicoCom(c.id, "o eleito", { pessoas: 2, quando: ONTEM() });

    await virarCiclo(ontem);
    await virarCiclo(ontem);

    expect(
      await db.notification.count({ where: { profileId: autor.id, kind: "topic_became_hot" } }),
    ).toBe(1);
  });
});

/**
 * O cartão do destaque mostra o que está sendo dito agora.
 *
 * `hotTopicDeHoje` passou a devolver a última contribuição e as primeiras
 * caras, porque o cartão do protótipo v6 as mostra. Antes eram só título,
 * abertura e dois números — o que diz que há movimento, mas não diz qual, e
 * é o qual que faz alguém entrar.
 */
describe("o que o cartão do destaque mostra", () => {
  it("devolve a última contribuição, e não a primeira", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Fotografia", dona);
    const { topico } = await topicoCom(c.id, "assunto", { pessoas: 2, quando: ONTEM() });

    const quem = await makeProfile({ name: "Lia Souza", handle: "liasouza" });
    await db.answer.create({
      data: {
        topicId: topico.id,
        authorId: quem.id,
        text: "a última de todas",
        createdAt: new Date(),
      },
    });

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));
    const destaque = await hotTopicDeHoje(c.id);

    expect(destaque?.ultima?.texto).toBe("a última de todas");
    expect(destaque?.ultima?.autorHandle).toBe("liasouza");
  });

  it("devolve as caras de quem participou, uma por pessoa", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Cinema", dona);
    const { topico } = await topicoCom(c.id, "assunto", { pessoas: 3, quando: ONTEM() });

    // A mesma pessoa contribuindo duas vezes aparece **uma** no rodapé: as
    // caras contam gente, não contribuições.
    const repetida = await makeProfile();
    for (const texto of ["uma", "outra"]) {
      await db.answer.create({
        data: { topicId: topico.id, authorId: repetida.id, text: texto, createdAt: ONTEM() },
      });
    }

    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));
    const destaque = await hotTopicDeHoje(c.id);

    expect(destaque?.primeirosRostos).toHaveLength(4);
  });

  it("tópico que só tem a abertura não inventa última contribuição", async () => {
    const dona = await makeProfile();
    const c = await comunidade("Teatro", dona);

    /*
     * Um tópico eleito **precisa** ter tido contribuição ontem, senão não
     * há eleição. Então o caso de `ultima` nula é o do tópico cujas
     * contribuições foram todas apagadas — e aí o cartão volta a ser
     * título, abertura e números, que é o que existe.
     */
    const { topico } = await topicoCom(c.id, "assunto", { pessoas: 2, quando: ONTEM() });
    await virarCiclo(new Date(await diaDoCiclo(ONTEM())));
    await db.answer.updateMany({ where: { topicId: topico.id }, data: { deletedAt: new Date() } });

    const destaque = await hotTopicDeHoje(c.id);

    expect(destaque?.ultima).toBeNull();
    expect(destaque?.primeirosRostos).toEqual([]);
    expect(destaque?.respostas).toBe(0);
  });
});
