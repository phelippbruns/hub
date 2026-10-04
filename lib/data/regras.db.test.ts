/**
 * As regras garantidas no banco.
 *
 * Cada teste **tenta violar a regra e espera falhar** — é o critério de aceite
 * da F02. Rodam contra o Postgres do Supabase local, porque índice único e
 * gatilho não existem em dublê.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, joinAs, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import { createTopic, deleteTopic, createAnswer } from "./topics";
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

describe("RN07: 1 tópico por pessoa por dia em cada comunidade", () => {
  it("recusa o segundo tópico do dia na mesma comunidade", async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);
    const viewer = viewerFor(lia.id);

    await createTopic(viewer, {
      communityId: community.id,
      name: "primeira festa",
      description: "Como foi a primeira festa?",
      media: null,
    });

    await expect(
      createTopic(viewer, {
        communityId: community.id,
        name: "segundo tópico",
        description: "Não deveria passar",
        media: null,
      }),
    ).rejects.toThrow(RuleViolationError);
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

  it("libera criar outro depois de apagar o do dia", async () => {
    const lia = await makeProfile();
    const universe = await makeUniverse();
    const community = await makeCommunity(universe.id, lia.id);
    const viewer = viewerFor(lia.id);

    const topic = await createTopic(viewer, {
      communityId: community.id,
      name: "um",
      description: "primeiro",
      media: null,
    });
    await deleteTopic(viewer, topic!.id);

    await expect(
      createTopic(viewer, {
        communityId: community.id,
        name: "dois",
        description: "depois de apagar",
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
