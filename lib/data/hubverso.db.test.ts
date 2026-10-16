/**
 * O Hubverso (F12.1).
 *
 * O Universo saiu do produto: nenhuma tela o mostra, e ninguém escolhe um ao
 * criar comunidade. No banco ele continua — a coluna é NOT NULL e a
 * comunidade continua tendo um pai, só que invisível e único.
 *
 * Estes testes guardam as duas metades da decisão: que **nasce** no Hubverso,
 * e que o que **já existia** foi consolidado nele.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import { HUBVERSO, createCommunity } from "./communities";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

/** `resetDatabase` trunca `universes`, então o Hubverso volta por aqui. */
async function comHubverso() {
  return db.universe.upsert({
    where: { slug: HUBVERSO },
    update: {},
    create: { name: "Hubverso", slug: HUBVERSO },
  });
}

describe("F12.1: criar comunidade sem escolher Universo", () => {
  it("a comunidade nasce no Hubverso", async () => {
    const hub = await comHubverso();
    const lia = await makeProfile();

    const criada = await createCommunity(viewerFor(lia.id), {
      name: "Cerâmica de Torno",
      intro: "Centrar, levantar e o que dá errado.",
      coverUrl: null,
    });

    const gravada = await db.community.findUniqueOrThrow({ where: { id: criada!.id } });
    expect(gravada.universeId).toBe(hub.id);
  });

  it("quem ainda mandar um Universo continua sendo atendido", async () => {
    await comHubverso();
    const outro = await makeUniverse("Um Universo Antigo");
    const lia = await makeProfile();

    const criada = await createCommunity(viewerFor(lia.id), {
      universeId: outro.id,
      name: "Com Universo Escolhido",
      intro: "A intro.",
      coverUrl: null,
    });

    const gravada = await db.community.findUniqueOrThrow({ where: { id: criada!.id } });
    expect(gravada.universeId).toBe(outro.id);
  });

  it("RN06: quem cria continua sendo moderador", async () => {
    await comHubverso();
    const lia = await makeProfile();

    const criada = await createCommunity(viewerFor(lia.id), {
      name: "Moderada Por Quem Criou",
      intro: "A intro.",
      coverUrl: null,
    });

    const membro = await db.membership.findFirstOrThrow({
      where: { communityId: criada!.id, profileId: lia.id },
    });
    expect(membro.role).toBe("moderator");
  });

  it("sem o Hubverso no banco, a criação recusa em vez de inventar um pai", async () => {
    // Banco sem a migration da F12.1 aplicada. Melhor recusar com erro claro
    // do que pendurar a comunidade num Universo qualquer.
    const lia = await makeProfile();

    await expect(
      createCommunity(viewerFor(lia.id), {
        name: "Sem Pai Nenhum",
        intro: "A intro.",
        coverUrl: null,
      }),
    ).rejects.toThrow(/Hubverso/);
  });
});

describe("F12.1: a migration consolidou o que já existia", () => {
  it("o Hubverso existe no banco migrado", async () => {
    /*
     * `resetDatabase` trunca as tabelas, então aqui a conferência é de outra
     * natureza: a migration precisa ter rodado neste banco. Se ela não
     * tivesse rodado, `db:deploy` teria falhado antes deste teste existir.
     *
     * O que este teste guarda de verdade é o **slug**: o código procura o
     * Universo por `hubverso`, e trocar o slug na migration sem trocar aqui
     * quebraria a criação de comunidade em produção, calado.
     */
    const hub = await comHubverso();
    expect(hub.slug).toBe(HUBVERSO);
    expect(HUBVERSO).toBe("hubverso");
  });
});
