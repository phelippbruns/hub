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
import { editarComunidade, paginaDaComunidade, topicosDaComunidade } from "./comunidades";
import { blockProfile } from "./cabins";
import { followProfile, followTopic } from "./follows";
import { createAnswer, createTopic } from "./topics";
import { marcarTopicoComoVisto } from "./inicio";
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
  return { lia, jo, rafa, comunidade, universo };
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

  /**
   * RN28: contribuição é resposta **ou** tópico criado.
   *
   * A linha de cada membro passou a mostrar "N contribuições", e o número é
   * da **comunidade onde a lista está** — não do Hub inteiro. Uma soma
   * global diria que a pessoa participa muito de um lugar onde ela nunca
   * escreveu.
   */
  it("RN28: conta resposta e tópico, e só os desta comunidade", async () => {
    const { lia, jo, comunidade, universo } = await cenario();

    // Jo abre um tópico aqui e responde nele: duas contribuições.
    const topico = await createTopic(viewerFor(jo.id), {
      communityId: comunidade.id,
      name: "Primeira festa",
      description: "Conta aí como foi.",
    });
    await createAnswer(viewerFor(jo.id), { topicId: topico!.id, text: "a minha foi num galpão" });

    // E escreve noutra comunidade, que não pode entrar na conta.
    const outra = await makeCommunity(universo.id, jo.id, "Outra");
    const laFora = await createTopic(viewerFor(jo.id), {
      communityId: outra.id,
      name: "Outro assunto",
      description: "Outra abertura.",
    });
    await createAnswer(viewerFor(jo.id), { topicId: laFora!.id, text: "nada a ver" });

    const membros = await membrosDaComunidade(viewerFor(lia.id), comunidade.id);
    const dele = membros.find((m) => m.handle === "jo");

    expect(dele?.contribuicoes).toBe(2);
    // E quem não escreveu nada tem zero, não `undefined`.
    expect(membros.find((m) => m.handle === "rafa")?.contribuicoes).toBe(0);
  });

  it("contribuição apagada deixa de contar", async () => {
    const { lia, jo, comunidade } = await cenario();

    const topico = await createTopic(viewerFor(jo.id), {
      communityId: comunidade.id,
      name: "Primeira festa",
      description: "Conta aí como foi.",
    });
    const resposta = await createAnswer(viewerFor(jo.id), {
      topicId: topico!.id,
      text: "a minha foi num galpão",
    });

    await db.answer.update({ where: { id: resposta!.id }, data: { deletedAt: new Date() } });

    const membros = await membrosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(membros.find((m) => m.handle === "jo")?.contribuicoes).toBe(1);
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

describe("a lista de tópicos da comunidade", () => {
  async function comTopico() {
    const base = await cenario();
    const topico = await createTopic(viewerFor(base.lia.id), {
      communityId: base.comunidade.id,
      name: "Primeira festa",
      description: "Conta como foi.",
      media: null,
    });
    return { ...base, topico };
  }

  it("traz a última contribuição, com quem escreveu", async () => {
    const { jo, comunidade, topico } = await comTopico();
    await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "A minha foi num porão em 2009.",
      media: null,
    });

    const [naLista] = await topicosDaComunidade(viewerFor(jo.id), comunidade.id);

    expect(naLista?.ultima?.texto).toBe("A minha foi num porão em 2009.");
    expect(naLista?.ultima?.autorHandle).toBe("jo");
    expect(naLista?.respostas).toBe(1);
  });

  it("tópico sem contribuição vem com ultima nula, e a tela diz isso", async () => {
    const { lia, comunidade } = await comTopico();

    const [naLista] = await topicosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(naLista?.ultima).toBeNull();
  });

  it("RN26: o tópico de quem me bloqueou some da lista", async () => {
    const { lia, jo, comunidade } = await cenario();
    await createTopic(viewerFor(jo.id), {
      communityId: comunidade.id,
      name: "Tópico do Jo",
      description: "Uma abertura qualquer.",
      media: null,
    });

    const antes = await topicosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(antes.map((t) => t.name)).toContain("Tópico do Jo");

    await blockProfile(viewerFor(jo.id), lia.id);

    const depois = await topicosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(depois.map((t) => t.name)).not.toContain("Tópico do Jo");
  });

  it("conta as contribuições novas desde a última visita, sem contar as minhas", async () => {
    const { lia, jo, comunidade, topico } = await comTopico();
    await followTopic(viewerFor(lia.id), topico.id);
    await marcarTopicoComoVisto(viewerFor(lia.id), topico.id);

    await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "Cheguei agora.",
      media: null,
    });
    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "Essa é minha, não conta.",
      media: null,
    });

    const [naLista] = await topicosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(naLista?.novas).toBe(1);
    expect(naLista?.seguindo).toBe(true);
  });

  it("quem não segue não tem novas, mesmo com contribuição recente", async () => {
    const { lia, jo, comunidade, topico } = await comTopico();
    await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "Oi.",
      media: null,
    });

    const [naLista] = await topicosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(naLista?.novas).toBe(0);
    expect(naLista?.seguindo).toBe(false);
  });
});

describe("RN06: editar a comunidade depois de criada", () => {
  it("quem modera muda nome, descrição, Sobre e regras", async () => {
    const { lia, comunidade } = await cenario();

    await editarComunidade(viewerFor(lia.id), comunidade.id, {
      name: "Animação Brasileira",
      intro: "Desenho, stop motion e o que mais vier.",
      about: "Um lugar para mostrar o que você está animando.",
      rules: "Mostre o processo.\nCritique o trabalho, nunca a pessoa.",
    });

    const pagina = await paginaDaComunidade(viewerFor(lia.id), comunidade.slug);
    expect(pagina.name).toBe("Animação Brasileira");
    expect(pagina.about).toBe("Um lugar para mostrar o que você está animando.");
    expect(pagina.regras).toHaveLength(2);
  });

  it("o endereço não muda junto com o nome: ele já foi compartilhado", async () => {
    const { lia, comunidade } = await cenario();
    const endereco = comunidade.slug;

    await editarComunidade(viewerFor(lia.id), comunidade.id, {
      name: "Outro Nome Completamente Diferente",
      intro: "Continua a mesma comunidade.",
      about: "",
      rules: "",
    });

    const guardada = await db.community.findUniqueOrThrow({ where: { id: comunidade.id } });
    expect(guardada.slug).toBe(endereco);
    expect(guardada.name).toBe("Outro Nome Completamente Diferente");
  });

  it("quem só é membro não edita", async () => {
    const { jo, comunidade } = await cenario();

    await expect(
      editarComunidade(viewerFor(jo.id), comunidade.id, {
        name: "Tomei a comunidade",
        intro: "Oi.",
        about: "",
        rules: "",
      }),
    ).rejects.toThrow();
  });

  it("RN04: renomear para um nome que já existe é recusado com a mensagem certa", async () => {
    const { lia, comunidade } = await cenario();
    const universo = await db.universe.findFirstOrThrow();
    await makeCommunity(universo.id, lia.id, "Fotografia");

    await expect(
      editarComunidade(viewerFor(lia.id), comunidade.id, {
        name: "fotografias",
        intro: "Tentando roubar o nome.",
        about: "",
        rules: "",
      }),
    ).rejects.toThrow(/já existe/i);
  });

  it("RN16: Sobre com link é recusado", async () => {
    const { lia, comunidade } = await cenario();

    await expect(
      editarComunidade(viewerFor(lia.id), comunidade.id, {
        name: comunidade.name,
        intro: "Oi.",
        about: "Veja mais em exemplo.com",
        rules: "",
      }),
    ).rejects.toThrow();
  });
});
