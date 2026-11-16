/**
 * Tópicos (F08): endereço, o limite do RN08 e o olho do RN18.
 *
 * As regras RN07 e RN08 já têm teste em `regras.db.test.ts`, que exercita os
 * gatilhos. Aqui ficam o que a F08 acrescenta: o endereço, o aviso antes de
 * escrever, o estado do botão de apagar e o seguir manual.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  LIMITE_RESPOSTAS_PARA_APAGAR,
  TOPICOS_POR_DIA,
  createAnswer,
  createTopic,
  jaCrieiTopicoHoje,
  respostasDeOutros,
  topicoPorEndereco,
} from "./topics";
import { createCommunity, joinCommunity } from "./communities";
import { followTopic, unfollowTopic, getCollection } from "./follows";
import { prisma } from "./prisma";
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
    description: "Uma pergunta de abertura.",
    media: null,
  });
  return db.topic.findUniqueOrThrow({ where: { id: criado!.id } });
}

describe("o endereço do tópico", () => {
  it("vem do nome, sem acento nem símbolo", async () => {
    const lia = await makeProfile();
    const c = await comunidade("Música Eletrônica", lia);

    const t = await topico(lia, c.id, "primeira festa");
    expect(t.slug).toBe("primeira-festa");
  });

  it("duas comunidades podem ter um tópico de mesmo nome", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const musica = await comunidade("Música", lia);
    const cinema = await comunidade("Cinema", jo);

    const a = await topico(lia, musica.id, "primeira festa");
    const b = await topico(jo, cinema.id, "primeira festa");

    // O nome do tópico é uma pergunta daquele grupo, não um nome global.
    expect(a.slug).toBe("primeira-festa");
    expect(b.slug).toBe("primeira-festa");
  });

  it("dentro da mesma comunidade, o segundo de mesmo nome ganha número", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const c = await comunidade("Música", lia);
    await joinCommunity(viewerFor(jo.id), c.id);

    const a = await topico(lia, c.id, "primeira festa");
    // RN07 limita a 1 por pessoa por dia, então o segundo vem de outra pessoa.
    const b = await topico(jo, c.id, "Primeira Festa");

    expect(a.slug).toBe("primeira-festa");
    expect(b.slug).toBe("primeira-festa-2");
  });

  it("acha o tópico pelo endereço", async () => {
    const lia = await makeProfile();
    const c = await comunidade("Música Eletrônica", lia);
    await topico(lia, c.id, "primeira festa");

    const achado = await topicoPorEndereco(viewerFor(lia.id), c.slug, "primeira-festa");
    expect(achado.name).toBe("primeira festa");
    expect(achado.community.slug).toBe(c.slug);
  });

  it("endereço de outra comunidade não acha o tópico", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const musica = await comunidade("Música", lia);
    const cinema = await comunidade("Cinema", jo);
    await topico(lia, musica.id, "primeira festa");

    await expect(
      topicoPorEndereco(viewerFor(lia.id), cinema.slug, "primeira-festa"),
    ).rejects.toThrow();
  });

  it("tópico apagado não abre mais", async () => {
    const lia = await makeProfile();
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "some daqui");
    await db.topic.update({ where: { id: t.id }, data: { deletedAt: new Date() } });

    await expect(topicoPorEndereco(viewerFor(lia.id), c.slug, t.slug)).rejects.toThrow();
  });
});

describe("RN08: o limite de respostas", () => {
  it("o número do banco e o do app são o mesmo", async () => {
    const linhas = await prisma.$queryRaw<{ limite: number }[]>`
      SELECT hub_limite_para_apagar() AS limite
    `;

    /*
     * O banco garante a regra; o app explica o botão desativado. Se os dois
     * discordarem, a tela promete o que o banco recusa — e ninguém perceberia
     * sem este teste.
     */
    expect(linhas[0]?.limite).toBe(LIMITE_RESPOSTAS_PARA_APAGAR);
  });

  it("conta só as respostas de outras pessoas", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const c = await comunidade("Música", lia);
    await joinCommunity(viewerFor(jo.id), c.id);
    const t = await topico(lia, c.id, "assunto");

    await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "eu mesma", media: null });
    await createAnswer(viewerFor(jo.id), { topicId: t.id, text: "outra pessoa", media: null });

    expect(await respostasDeOutros(t.id, lia.id)).toBe(1);
  });

  it("a página diz que dá para apagar abaixo do limite", async () => {
    const lia = await makeProfile();
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");

    const pagina = await topicoPorEndereco(viewerFor(lia.id), c.slug, t.slug);
    expect(pagina.souAutor).toBe(true);
    expect(pagina.podeApagar).toBe(true);
  });

  it("no limite, a página diz que não dá mais", async () => {
    const lia = await makeProfile();
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");

    for (let i = 0; i < LIMITE_RESPOSTAS_PARA_APAGAR; i += 1) {
      const outra = await makeProfile();
      await joinCommunity(viewerFor(outra.id), c.id);
      await createAnswer(viewerFor(outra.id), { topicId: t.id, text: `r${i}`, media: null });
    }

    const pagina = await topicoPorEndereco(viewerFor(lia.id), c.slug, t.slug);
    expect(pagina.respostasDeOutros).toBe(LIMITE_RESPOSTAS_PARA_APAGAR);
    expect(pagina.podeApagar).toBe(false);
  });

  it("quem não é autor nunca vê o apagar", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");

    const pagina = await topicoPorEndereco(viewerFor(jo.id), c.slug, t.slug);
    expect(pagina.souAutor).toBe(false);
    expect(pagina.podeApagar).toBe(false);
  });
});

describe("RN07: avisar antes de escrever", () => {
  it("RN07: o número do banco e o do app são o mesmo", async () => {
    const linhas = await prisma.$queryRaw<{ limite: number }[]>`
      SELECT hub_topicos_por_dia() AS limite
    `;

    /*
     * O gatilho garante a regra; o app explica o aviso e o formulário
     * desligado. Se os dois discordarem, a tela deixa escrever onde o banco
     * recusa — ou, pior, fecha a porta que o banco deixou aberta. Ninguém
     * perceberia sem este teste.
     */
    expect(linhas[0]?.limite).toBe(TOPICOS_POR_DIA);
  });

  it(`RN07: só avisa depois do ${TOPICOS_POR_DIA}º tópico do dia`, async () => {
    const lia = await makeProfile();
    const c = await comunidade("Música", lia);

    expect(await jaCrieiTopicoHoje(viewerFor(lia.id), c.id)).toBe(false);

    /*
     * **Confere no penúltimo também.** Um aviso que só olhasse "existe
     * algum tópico hoje" passaria no primeiro e no último; é o meio que
     * distingue a contagem do booleano antigo.
     */
    for (let i = 1; i < TOPICOS_POR_DIA; i += 1) {
      await topico(lia, c.id, `tópico ${i}`);
      expect(await jaCrieiTopicoHoje(viewerFor(lia.id), c.id)).toBe(false);
    }

    await topico(lia, c.id, "o que fecha a cota");
    expect(await jaCrieiTopicoHoje(viewerFor(lia.id), c.id)).toBe(true);
  });

  it("RN07: o limite é por comunidade, não do Hub inteiro", async () => {
    const lia = await makeProfile();
    const musica = await comunidade("Música", lia);
    const cinema = await comunidade("Cinema", lia);

    for (let i = 1; i <= TOPICOS_POR_DIA; i += 1) {
      await topico(lia, musica.id, `tópico ${i}`);
    }

    expect(await jaCrieiTopicoHoje(viewerFor(lia.id), musica.id)).toBe(true);
    expect(await jaCrieiTopicoHoje(viewerFor(lia.id), cinema.id)).toBe(false);
  });

  it("RN07: apagar um tópico do dia devolve a vaga", async () => {
    const lia = await makeProfile();
    const c = await comunidade("Música", lia);

    let primeiro: { id: string } | null = null;
    for (let i = 1; i <= TOPICOS_POR_DIA; i += 1) {
      const t = await topico(lia, c.id, `tópico ${i}`);
      primeiro ??= t;
    }
    expect(await jaCrieiTopicoHoje(viewerFor(lia.id), c.id)).toBe(true);

    await db.topic.update({ where: { id: primeiro!.id }, data: { deletedAt: new Date() } });

    expect(await jaCrieiTopicoHoje(viewerFor(lia.id), c.id)).toBe(false);
  });
});

describe("RN18: seguir é sempre manual", () => {
  it("responder não segue o tópico", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const c = await comunidade("Música", lia);
    await joinCommunity(viewerFor(jo.id), c.id);
    const t = await topico(lia, c.id, "assunto");

    await createAnswer(viewerFor(jo.id), { topicId: t.id, text: "respondi", media: null });

    const pagina = await topicoPorEndereco(viewerFor(jo.id), c.slug, t.slug);
    expect(pagina.following).toBe(false);
  });

  it("criar o próprio tópico também não segue", async () => {
    const lia = await makeProfile();
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "meu");

    const pagina = await topicoPorEndereco(viewerFor(lia.id), c.slug, t.slug);
    expect(pagina.following).toBe(false);
  });

  it("o olho segue, e o tópico aparece na Coleção", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");

    await followTopic(viewerFor(jo.id), t.id);

    const pagina = await topicoPorEndereco(viewerFor(jo.id), c.slug, t.slug);
    expect(pagina.following).toBe(true);

    // Em ordem cronológica a Coleção devolve os tópicos direto.
    const colecao = await getCollection(viewerFor(jo.id), jo.id);
    expect(colecao.map((topico) => topico.id)).toContain(t.id);
  });

  it("o olho desliga de novo", async () => {
    const lia = await makeProfile();
    const jo = await makeProfile();
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");

    await followTopic(viewerFor(jo.id), t.id);
    await unfollowTopic(viewerFor(jo.id), t.id);

    const pagina = await topicoPorEndereco(viewerFor(jo.id), c.slug, t.slug);
    expect(pagina.following).toBe(false);
  });
});
