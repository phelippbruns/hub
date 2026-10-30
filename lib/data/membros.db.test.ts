/**
 * A aba Membros da comunidade, as regras e o endereço reservado de tópico.
 *
 * Três coisas que nasceram juntas na rodada do protótipo v6, e que têm em
 * comum o fato de o banco ser quem garante: o teto de cinco regras, o
 * bloqueio que esconde nos dois sentidos, e o slug que não pode colidir com
 * rota irmã.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, joinAs, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import { membrosDaComunidade } from "./membros";
import { paginaDaComunidade } from "./comunidades";
import { blockProfile } from "./cabins";
import { followProfile } from "./follows";
import { createTopic } from "./topics";
import { SLUGS_DE_TOPICO_RESERVADOS, linhasDasRegras, regrasSchema } from "./validation";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

async function cenario() {
  const lia = await makeProfile({ handle: "lia", name: "Lia Souza" });
  const jo = await makeProfile({ handle: "jo", name: "Jo Ramos" });
  const rafa = await makeProfile({ handle: "rafa", name: "Rafa Lima" });
  const universo = await makeUniverse("Hubverso de teste");
  const comunidade = await makeCommunity(universo.id, lia.id, "Animação");
  await joinAs(comunidade.id, jo.id);
  await joinAs(comunidade.id, rafa.id);
  return { lia, jo, rafa, comunidade };
}

describe("a aba Membros", () => {
  it("lista quem está dentro, com quem modera primeiro", async () => {
    const { lia, comunidade } = await cenario();

    const membros = await membrosDaComunidade(viewerFor(lia.id), comunidade.id);

    expect(membros).toHaveLength(3);
    expect(membros[0]?.handle).toBe("lia");
    expect(membros[0]?.moderador).toBe(true);
    expect(membros[0]?.criador).toBe(true);
    expect(membros[0]?.souEu).toBe(true);
  });

  it("RN26: quem me bloqueou não aparece, e quem eu bloqueei também não", async () => {
    const { lia, jo, rafa, comunidade } = await cenario();

    // Jo bloqueia Lia: o bloqueio vale nos dois sentidos.
    await blockProfile(viewerFor(jo.id), lia.id);

    const paraLia = await membrosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(paraLia.map((m) => m.handle).sort()).toEqual(["lia", "rafa"]);

    const paraJo = await membrosDaComunidade(viewerFor(jo.id), comunidade.id);
    expect(paraJo.map((m) => m.handle).sort()).toEqual(["jo", "rafa"]);

    // Quem não está no bloqueio continua vendo todo mundo.
    const paraRafa = await membrosDaComunidade(viewerFor(rafa.id), comunidade.id);
    expect(paraRafa).toHaveLength(3);
  });

  it("diz quem eu já sigo, numa consulta só", async () => {
    const { lia, jo, comunidade } = await cenario();
    await followProfile(viewerFor(lia.id), jo.id);

    const membros = await membrosDaComunidade(viewerFor(lia.id), comunidade.id);

    expect(membros.find((m) => m.handle === "jo")?.sigo).toBe(true);
    expect(membros.find((m) => m.handle === "rafa")?.sigo).toBe(false);
  });

  it("o filtro Moderação traz só quem modera", async () => {
    const { lia, comunidade } = await cenario();

    const membros = await membrosDaComunidade(viewerFor(lia.id), comunidade.id, {
      filtro: "moderacao",
    });

    expect(membros.map((m) => m.handle)).toEqual(["lia"]);
  });

  it("a busca acha por nome e por @, sem distinguir maiúsculas", async () => {
    const { lia, comunidade } = await cenario();

    const porNome = await membrosDaComunidade(viewerFor(lia.id), comunidade.id, { termo: "RAFA" });
    expect(porNome.map((m) => m.handle)).toEqual(["rafa"]);

    const porHandle = await membrosDaComunidade(viewerFor(lia.id), comunidade.id, { termo: "Jo" });
    expect(porHandle.map((m) => m.handle)).toEqual(["jo"]);
  });

  it("banido não aparece na lista", async () => {
    const { lia, jo, comunidade } = await cenario();
    await db.membership.update({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: jo.id } },
      data: { bannedAt: new Date() },
    });

    const membros = await membrosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(membros.map((m) => m.handle)).not.toContain("jo");
  });
});

describe("as regras da comunidade", () => {
  it("chegam à tela já quebradas em linhas, sem as vazias", async () => {
    const { lia, comunidade } = await cenario();
    await db.community.update({
      where: { id: comunidade.id },
      data: { rules: "Mostre o processo.\n\nCritique o trabalho, não a pessoa.\n" },
    });

    const pagina = await paginaDaComunidade(viewerFor(lia.id), comunidade.slug);

    expect(pagina.regras).toEqual(["Mostre o processo.", "Critique o trabalho, não a pessoa."]);
  });

  it("comunidade sem regras devolve lista vazia, que é o que abre a porta num clique", async () => {
    const { lia, comunidade } = await cenario();

    const pagina = await paginaDaComunidade(viewerFor(lia.id), comunidade.slug);
    expect(pagina.regras).toEqual([]);
  });

  it("o Zod recusa a sexta regra, com a mensagem boa", () => {
    const seis = ["a", "b", "c", "d", "e", "f"].join("\n");
    const resultado = regrasSchema.safeParse(seis);

    expect(resultado.success).toBe(false);
    expect(resultado.error?.issues[0]?.message).toContain("no máximo 5");
  });

  it("RN16: regra com link é recusada, e quem modera não é exceção", () => {
    const resultado = regrasSchema.safeParse("Veja mais em exemplo.com");
    expect(resultado.success).toBe(false);
  });

  it("o CHECK do banco recusa a sexta regra num UPDATE cru", async () => {
    const { comunidade } = await cenario();

    await expect(
      db.community.update({
        where: { id: comunidade.id },
        data: { rules: "a\nb\nc\nd\ne\nf" },
      }),
    ).rejects.toThrow();
  });

  it("cinco regras passam pelos dois lados", async () => {
    const { comunidade } = await cenario();
    const cinco = "a\nb\nc\nd\ne";

    expect(regrasSchema.safeParse(cinco).success).toBe(true);
    await expect(
      db.community.update({ where: { id: comunidade.id }, data: { rules: cinco } }),
    ).resolves.toBeTruthy();
  });

  it("linhasDasRegras conta o que a tela mostra, não os enters soltos", () => {
    expect(linhasDasRegras("a\n\n\nb\n")).toEqual(["a", "b"]);
    expect(linhasDasRegras("")).toEqual([]);
  });
});

describe("o endereço do tópico não colide com rota irmã", () => {
  it.each([...SLUGS_DE_TOPICO_RESERVADOS])(
    'um tópico chamado "%s" ganha outro endereço, e o nome continua valendo',
    async (reservado) => {
      const { lia, comunidade } = await cenario();

      const topico = await createTopic(viewerFor(lia.id), {
        communityId: comunidade.id,
        name: reservado,
        description: "Uma abertura qualquer para o tópico.",
        media: null,
      });

      const guardado = await db.topic.findUniqueOrThrow({ where: { id: topico.id } });
      expect(guardado.name).toBe(reservado);
      expect(guardado.slug).not.toBe(reservado);
      // O gatilho trata reservado como colisão e numera: "novo" vira "novo-2".
      expect(guardado.slug.startsWith(`${reservado}-`)).toBe(true);
      expect(Number(guardado.slug.slice(reservado.length + 1))).toBeGreaterThan(1);
    },
  );

  it("um nome comum continua virando o endereço óbvio", async () => {
    const { lia, comunidade } = await cenario();

    const topico = await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "Primeira festa",
      description: "Uma abertura qualquer para o tópico.",
      media: null,
    });

    const guardado = await db.topic.findUniqueOrThrow({ where: { id: topico.id } });
    expect(guardado.slug).toBe("primeira-festa");
  });
});
