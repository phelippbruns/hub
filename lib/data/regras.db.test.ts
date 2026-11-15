/**
 * As regras garantidas no banco.
 *
 * Cada teste **tenta violar a regra e espera falhar** — é o critério de aceite
 * da F02. Rodam contra o Postgres do Supabase local, porque índice único e
 * gatilho não existem em dublê.
 */
import { beforeEach, describe, expect, it } from "vitest";
import pg from "pg";
import {
  db,
  duasTransacoes,
  joinAs,
  makeCommunity,
  makeProfile,
  makeUniverse,
  resetDatabase,
} from "./testing/db";
import { TOPICOS_POR_DIA, createTopic, deleteTopic, createAnswer } from "./topics";
import { createCommunity } from "./communities";
import { inviteToCabin } from "./cabins";
import { viewerFor } from "./viewer";
import { RuleViolationError } from "./errors";

beforeEach(resetDatabase);

describe("RN04: não existem duas comunidades com o mesmo nome", () => {
  it.each([
    ["maiúsculas", "Música Eletrônica", "MÚSICA ELETRÔNICA"],
    ["acentos", "Música Eletrônica", "Musica Eletronica"],
    ["espaços", "Música Eletrônica", "  Música   Eletrônica  "],
    ["plural simples", "Fotografia de Paisagem", "Fotografia de Paisagens"],
  ])("recusa o mesmo nome diferindo por %s", async (_caso, primeiro, segundo) => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const viewer = viewerFor(lia.id);

    await createCommunity(viewer, {
      universeId: universe.id,
      name: primeiro,
      intro: "intro",
      coverUrl: null,
    });

    await expect(
      createCommunity(viewer, {
        universeId: universe.id,
        name: segundo,
        intro: "intro",
        coverUrl: null,
      }),
    ).rejects.toThrow(RuleViolationError);
  });

  it("deixa passar nomes de verdade diferentes", async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const viewer = viewerFor(lia.id);

    await createCommunity(viewer, {
      universeId: universe.id,
      name: "Vinil",
      intro: "intro",
      coverUrl: null,
    });
    await expect(
      createCommunity(viewer, {
        universeId: universe.id,
        name: "Techno Minimal",
        intro: "intro",
        coverUrl: null,
      }),
    ).resolves.toBeTruthy();
  });
});

describe(`RN07: ${TOPICOS_POR_DIA} tópicos por pessoa por dia em cada comunidade`, () => {
  it(`RN07: aceita o ${TOPICOS_POR_DIA}º tópico do dia e recusa o seguinte`, async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);
    const viewer = viewerFor(lia.id);

    /*
     * Os dez primeiros passam, um a um. Criar só dois e afirmar que o
     * segundo passa não distinguiria o limite 10 do limite nenhum — foi
     * um índice único até 15 de novembro de 2026, e o que o substituiu é
     * uma contagem, que pode errar o número sem errar a existência.
     */
    for (let i = 1; i <= TOPICOS_POR_DIA; i += 1) {
      await expect(
        createTopic(viewer, {
          communityId: community.id,
          name: `tópico ${i}`,
          description: `O de número ${i}`,
          media: null,
        }),
      ).resolves.toBeTruthy();
    }

    await expect(
      createTopic(viewer, {
        communityId: community.id,
        name: "o que passa do limite",
        description: "Não deveria passar",
        media: null,
      }),
    ).rejects.toThrow(RuleViolationError);
  });

  it(`RN07: duas transações ao mesmo tempo não passam do ${TOPICOS_POR_DIA}º`, async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);
    const viewer = viewerFor(lia.id);

    // Deixa **uma** vaga, e manda duas transações disputá-la.
    for (let i = 1; i < TOPICOS_POR_DIA; i += 1) {
      await createTopic(viewer, {
        communityId: community.id,
        name: `tópico ${i}`,
        description: `O de número ${i}`,
        media: null,
      });
    }

    /*
     * **Duas conexões, não `Promise.all` sobre o Prisma.** Medido em 15 de
     * novembro de 2026: duas chamadas de `createTopic` em paralelo
     * **serializam** no cliente, e o teste passava igual com a trava
     * arrancada do gatilho — ou seja, não provava nada. Para ver a corrida
     * é preciso abrir duas transações e intercalá-las à mão.
     *
     * É esta a razão de o gatilho travar a linha de quem escreve antes de
     * contar. Sem `FOR UPDATE`, as duas contam o mesmo, as duas passam, e a
     * comunidade termina o dia com uma a mais — sem erro em lugar nenhum.
     */
    const { bloqueou, resultados } = await duasTransacoes(
      async ({ a, b, commitA, esperarBloqueioDeB }) => {
        const inserir = (cliente: pg.Client, nome: string) =>
          cliente.query(
            // `slug` e `cycle_date` são preenchidos por gatilho, mas as
            // colunas são NOT NULL: o INSERT precisa mandar algo.
            `INSERT INTO topics (id, community_id, author_id, name, slug, description, cycle_date)
             VALUES (gen_random_uuid(), $1, $2, $3, $4, 'disputa', now())`,
            [community.id, lia.id, nome, nome],
          );

        const comoFoi = (promessa: Promise<unknown>) =>
          promessa.then(
            () => ({ status: "fulfilled" as const }),
            () => ({ status: "rejected" as const }),
          );

        /*
         * A ordem é o teste inteiro:
         *
         * 1. A insere e **não** confirma — contou 9, e segura a trava;
         * 2. B tenta inserir com A ainda aberta, e tem de **ficar parada**;
         * 3. A confirma, B acorda, conta 10 e é recusada.
         *
         * O passo 2 é o que separa barreira de sorte: sem a trava, B conta
         * 9 e passa, e o resultado final depende de quem chega primeiro na
         * rede.
         */
        const primeira = await comoFoi(inserir(a, "disputa-a"));
        const segunda = comoFoi(inserir(b, "disputa-b"));

        const bloqueou = await esperarBloqueioDeB();
        await commitA();

        return { bloqueou, resultados: [primeira, await segunda] };
      },
    );

    // RN07: a segunda espera a primeira, em vez de contar junto com ela.
    expect(bloqueou).toBe(true);
    expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
    expect(resultados.filter((r) => r.status === "rejected")).toHaveLength(1);

    const total = await db.topic.count({
      where: { communityId: community.id, authorId: lia.id, deletedAt: null },
    });
    expect(total).toBe(TOPICOS_POR_DIA);
  });

  it("deixa a mesma pessoa criar em outra comunidade no mesmo dia", async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const a = await makeCommunity(universe.id, lia.id);
    const b = await makeCommunity(universe.id, lia.id);
    const viewer = viewerFor(lia.id);

    await createTopic(viewer, {
      communityId: a.id,
      name: "um",
      description: "primeiro",
      media: null,
    });
    await expect(
      createTopic(viewer, {
        communityId: b.id,
        name: "dois",
        description: "segundo",
        media: null,
      }),
    ).resolves.toBeTruthy();
  });

  it("deixa outra pessoa criar na mesma comunidade no mesmo dia", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);
    await joinAs(community.id, jo.id);

    await createTopic(viewerFor(lia.id), {
      communityId: community.id,
      name: "um",
      description: "da Lia",
      media: null,
    });
    await expect(
      createTopic(viewerFor(jo.id), {
        communityId: community.id,
        name: "dois",
        description: "do Jo",
        media: null,
      }),
    ).resolves.toBeTruthy();
  });

  it("RN07: apagar um tópico do dia devolve a vaga", async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);
    const viewer = viewerFor(lia.id);

    /*
     * **Enche a cota antes de apagar.** Criar um, apagar e criar outro
     * passaria com limite 10 mesmo que a contagem ignorasse `deleted_at`
     * por completo — o teste precisa estar na borda para dizer algo.
     */
    let primeiro: { id: string } | null = null;
    for (let i = 1; i <= TOPICOS_POR_DIA; i += 1) {
      const criado = await createTopic(viewer, {
        communityId: community.id,
        name: `tópico ${i}`,
        description: `O de número ${i}`,
        media: null,
      });
      primeiro ??= criado;
    }

    await expect(
      createTopic(viewer, {
        communityId: community.id,
        name: "com a cota cheia",
        description: "não passa",
        media: null,
      }),
    ).rejects.toThrow(RuleViolationError);

    await deleteTopic(viewer, primeiro!.id);

    await expect(
      createTopic(viewer, {
        communityId: community.id,
        name: "depois de apagar",
        description: "a vaga voltou",
        media: null,
      }),
    ).resolves.toBeTruthy();
  });
});

describe("RN08: apagar tópico só com menos de 5 respostas de outras pessoas", () => {
  async function topicWithAnswers(count: number) {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);
    const topic = await createTopic(viewerFor(lia.id), {
      communityId: community.id,
      name: "tópico",
      description: "abertura",
      media: null,
    });

    for (let i = 0; i < count; i += 1) {
      const outra = await makeProfile();
      await joinAs(community.id, outra.id);
      await createAnswer(viewerFor(outra.id), {
        topicId: topic!.id,
        text: `resposta ${i}`,
        media: null,
      });
    }

    return { lia, topic: topic!, community };
  }

  it("deixa apagar com 4 respostas de outras pessoas", async () => {
    const { lia, topic } = await topicWithAnswers(4);
    await expect(deleteTopic(viewerFor(lia.id), topic.id)).resolves.toBeTruthy();
  });

  it("recusa apagar com 5 respostas de outras pessoas", async () => {
    const { lia, topic } = await topicWithAnswers(5);
    await expect(deleteTopic(viewerFor(lia.id), topic.id)).rejects.toThrow(RuleViolationError);
  });

  it("não conta as respostas do próprio autor", async () => {
    const { lia, topic } = await topicWithAnswers(4);
    // O autor responde ao próprio tópico: continua podendo apagar.
    await createAnswer(viewerFor(lia.id), {
      topicId: topic.id,
      text: "comentário do autor",
      media: null,
    });
    await expect(deleteTopic(viewerFor(lia.id), topic.id)).resolves.toBeTruthy();
  });

  it("a moderação apaga mesmo com 5 ou mais respostas", async () => {
    const { topic, community } = await topicWithAnswers(5);
    const mod = await makeProfile();
    await db.membership.create({
      data: { communityId: community.id, profileId: mod.id, role: "moderator" },
    });

    await expect(deleteTopic(viewerFor(mod.id), topic.id)).resolves.toBeTruthy();
  });
});

describe("RN20: a Cabine tem no máximo 5 pessoas", () => {
  it("recusa a sexta pessoa", async () => {
    const cabin = await db.cabin.create({ data: {} });
    for (let i = 0; i < 5; i += 1) {
      const person = await makeProfile();
      await db.cabinMember.create({ data: { cabinId: cabin.id, profileId: person.id } });
    }

    const sexta = await makeProfile();
    await expect(
      db.cabinMember.create({ data: { cabinId: cabin.id, profileId: sexta.id } }),
    ).rejects.toThrow(/RN20/);
  });
});

describe("RN21: 10 convites de Cabine por dia, contando pendentes", () => {
  it("recusa o décimo primeiro convite do dia", async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);
    const viewer = viewerFor(lia.id);

    for (let i = 0; i < 10; i += 1) {
      const convidado = await makeProfile();
      await joinAs(community.id, convidado.id);
      await inviteToCabin(viewer, { inviteeId: convidado.id, message: null });
    }

    const umAMais = await makeProfile();
    await joinAs(community.id, umAMais.id);
    await expect(inviteToCabin(viewer, { inviteeId: umAMais.id, message: null })).rejects.toThrow(
      RuleViolationError,
    );
  });

  it("só convida quem divide ao menos uma comunidade", async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    await makeCommunity(universe.id, lia.id);
    const estranho = await makeProfile();

    await expect(
      inviteToCabin(viewerFor(lia.id), { inviteeId: estranho.id, message: null }),
    ).rejects.toThrow(RuleViolationError);
  });
});

describe("RN16: links são bloqueados em todo texto", () => {
  it.each([
    "entra em https://exemplo.com",
    "meusite.com tem mais",
    "me chama em fulano@exemplo.com",
  ])("recusa %s", async (texto) => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);

    await expect(
      createTopic(viewerFor(lia.id), {
        communityId: community.id,
        name: "tópico",
        description: texto,
        media: null,
      }),
    ).rejects.toThrow();
  });
});
