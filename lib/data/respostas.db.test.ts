/**
 * Respostas e capa (F09): o que a camada de dados garante.
 *
 * A detecção de links tem os 53 casos em `lib/texto/links.test.ts`, e a
 * limpeza de imagem tem os 23 em `lib/midia/imagem.test.ts`. Aqui ficam as
 * regras que só o banco prova.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  createAnswer,
  createTopic,
  deleteAnswer,
  respostasDoTopico,
  topicoPorEndereco,
} from "./topics";
import { createCommunity, joinCommunity } from "./communities";
import { trocarCapa } from "./comunidades";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

async function cenario() {
  const lia = await makeProfile({ name: "Lia Souza", handle: "lia" });
  const jo = await makeProfile({ name: "Jo Ramos", handle: "jo" });
  const universo = await makeUniverse("Música");

  const criada = await createCommunity(viewerFor(lia.id), {
    universeId: universo.id,
    name: "Música Eletrônica",
    intro: "intro",
    coverUrl: null,
  });
  const comunidade = await db.community.findUniqueOrThrow({ where: { id: criada!.id } });
  await joinCommunity(viewerFor(jo.id), comunidade.id);

  const criado = await createTopic(viewerFor(lia.id), {
    communityId: comunidade.id,
    name: "primeira festa",
    description: "Como foi?",
    media: null,
  });
  const topico = await db.topic.findUniqueOrThrow({ where: { id: criado!.id } });

  return { lia, jo, comunidade, topico };
}

describe("RN13: responder", () => {
  it("quem não é membro não responde", async () => {
    const { topico } = await cenario();
    const estranha = await makeProfile();

    await expect(
      createAnswer(viewerFor(estranha.id), { topicId: topico.id, text: "oi", media: null }),
    ).rejects.toThrow();
  });

  it("RN16: resposta com endereço é recusada pelo servidor", async () => {
    const { jo, topico } = await cenario();

    // A tela avisa antes; isto é a regra, que vale mesmo sem a tela.
    for (const texto of ["olha meusite.com", "meusite ponto com", "fulano@exemplo.com"]) {
      await expect(
        createAnswer(viewerFor(jo.id), { topicId: topico.id, text: texto, media: null }),
      ).rejects.toThrow(/RN16|links/i);
    }
  });

  it("241 caracteres não passa, 240 passa", async () => {
    const { jo, topico } = await cenario();

    await expect(
      createAnswer(viewerFor(jo.id), { topicId: topico.id, text: "a".repeat(241), media: null }),
    ).rejects.toThrow();

    await expect(
      createAnswer(viewerFor(jo.id), { topicId: topico.id, text: "a".repeat(240), media: null }),
    ).resolves.toBeTruthy();
  });

  it("a imagem guarda o caminho no depósito, não um endereço", async () => {
    const { jo, topico } = await cenario();

    const resposta = await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "com foto",
      media: { caminho: "respostas/abc.jpg", kind: "image" },
    });

    // O depósito é privado: o endereço é assinado na hora de exibir, e por
    // isso não pode ser guardado.
    const gravada = await db.answer.findUniqueOrThrow({ where: { id: resposta.id } });
    expect(gravada.mediaUrl).toBe("respostas/abc.jpg");
    expect(gravada.mediaKind).toBe("image");
  });

  it("RN13: só um GIF já é resposta, sem nada escrito", async () => {
    const { jo, topico } = await cenario();

    const resposta = await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "",
      media: { caminho: "https://media.giphy.com/abc.gif", kind: "gif" },
    });

    const gravada = await db.answer.findUniqueOrThrow({ where: { id: resposta.id } });
    expect(gravada.text).toBe("");
    expect(gravada.mediaKind).toBe("gif");
  });

  it("RN13: só uma imagem já é resposta, sem nada escrito", async () => {
    const { jo, topico } = await cenario();

    const resposta = await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "   ",
      media: { caminho: "respostas/abc.jpg", kind: "image" },
    });

    expect(resposta.text).toBe("");
  });

  it("RN13: sem texto e sem mídia não é resposta", async () => {
    const { jo, topico } = await cenario();

    await expect(
      createAnswer(viewerFor(jo.id), { topicId: topico.id, text: "", media: null }),
    ).rejects.toThrow(/texto|imagem|GIF/i);
  });

  it("RN13: o banco recusa a resposta em branco mesmo sem passar pelo app", async () => {
    /*
     * A conferência do app dá a mensagem boa; este CHECK é a garantia. Sem
     * ele, qualquer escrita nova que esquecesse a regra publicaria um cartão
     * vazio que ninguém consegue explicar.
     */
    const { jo, topico } = await cenario();

    await expect(
      db.answer.create({ data: { topicId: topico.id, authorId: jo.id, text: "" } }),
    ).rejects.toThrow(/answers_texto_ou_midia/);
  });
});

describe("RN14: apagar a própria resposta", () => {
  it("some para todo mundo, não só para quem apagou", async () => {
    const { lia, jo, comunidade, topico } = await cenario();

    const resposta = await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "vou apagar isso",
      media: null,
    });

    const antes = await topicoPorEndereco(viewerFor(lia.id), comunidade.slug, topico.slug);
    expect(antes.answers?.map((r) => r.id)).toContain(resposta.id);

    await deleteAnswer(viewerFor(jo.id), resposta.id);

    // Quem olha é a Lia, não quem apagou.
    const depois = await topicoPorEndereco(viewerFor(lia.id), comunidade.slug, topico.slug);
    expect(depois.answers?.map((r) => r.id)).not.toContain(resposta.id);
    expect(depois.answerCount).toBe(0);
  });

  it("ninguém apaga a resposta de outra pessoa", async () => {
    const { lia, jo, topico } = await cenario();

    const resposta = await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "minha resposta",
      media: null,
    });

    // A Lia modera a comunidade, então ela pode (RN33) — quem não pode é
    // um membro qualquer.
    const outra = await makeProfile();
    await expect(deleteAnswer(viewerFor(outra.id), resposta.id)).rejects.toThrow();
    void lia;
  });

  it("a página marca qual resposta é minha", async () => {
    const { lia, jo, comunidade, topico } = await cenario();
    await createAnswer(viewerFor(jo.id), { topicId: topico.id, text: "do Jo", media: null });

    const paraJo = await topicoPorEndereco(viewerFor(jo.id), comunidade.slug, topico.slug);
    expect(paraJo.answers?.[0]?.souAutor).toBe(true);

    const paraLia = await topicoPorEndereco(viewerFor(lia.id), comunidade.slug, topico.slug);
    expect(paraLia.answers?.[0]?.souAutor).toBe(false);
  });
});

describe("RN06: a capa da comunidade", () => {
  it("quem modera troca", async () => {
    const { lia, comunidade } = await cenario();

    await trocarCapa(viewerFor(lia.id), comunidade.id, "capas/nova.jpg");

    const depois = await db.community.findUniqueOrThrow({ where: { id: comunidade.id } });
    expect(depois.coverUrl).toBe("capas/nova.jpg");
  });

  it("membro comum não troca", async () => {
    const { jo, comunidade } = await cenario();

    await expect(trocarCapa(viewerFor(jo.id), comunidade.id, "capas/invasora.jpg")).rejects.toThrow(
      /modera/i,
    );
  });

  it("quem nem é membro não troca", async () => {
    const { comunidade } = await cenario();
    const estranha = await makeProfile();

    await expect(
      trocarCapa(viewerFor(estranha.id), comunidade.id, "capas/invasora.jpg"),
    ).rejects.toThrow();
  });

  it("a capa antiga é devolvida para ser apagada do depósito", async () => {
    const { lia, comunidade } = await cenario();

    await trocarCapa(viewerFor(lia.id), comunidade.id, "capas/primeira.jpg");
    const { anteriorParaApagar } = await trocarCapa(
      viewerFor(lia.id),
      comunidade.id,
      "capas/segunda.jpg",
    );

    // Guardar imagem que ninguém mais vê custa espaço e aumenta o que vaza.
    expect(anteriorParaApagar).toBe("capas/primeira.jpg");
  });

  it("a capa do Universo nunca é apagada", async () => {
    const { lia, comunidade } = await cenario();

    // Ela é compartilhada: apagar tiraria a capa de todas as outras.
    await db.universe.update({
      where: { id: comunidade.universeId },
      data: { defaultCoverUrl: "https://exemplo.test/padrao.jpg" },
    });
    await db.community.update({
      where: { id: comunidade.id },
      data: { coverUrl: "https://exemplo.test/padrao.jpg" },
    });

    const { anteriorParaApagar } = await trocarCapa(
      viewerFor(lia.id),
      comunidade.id,
      "capas/propria.jpg",
    );
    expect(anteriorParaApagar).toBeNull();
  });
});

/* ------------------------------------------------- a rodada de acabamento */

describe("a ordem das respostas", () => {
  it("a mais nova vem em cima, por padrão", async () => {
    const { lia, jo, topico, comunidade } = await cenario();

    await createAnswer(viewerFor(lia.id), { topicId: topico.id, text: "primeira", media: null });
    await createAnswer(viewerFor(jo.id), { topicId: topico.id, text: "segunda", media: null });

    const tela = await topicoPorEndereco(viewerFor(lia.id), comunidade.slug, topico.slug);

    // Quem volta ao tópico quer o que chegou depois da última visita, não
    // rolar quarenta respostas até o fim.
    expect(tela.answers?.map((r) => r.text)).toEqual(["segunda", "primeira"]);
  });

  it("dá para ler como conversa, da primeira para a última", async () => {
    const { lia, jo, topico } = await cenario();

    await createAnswer(viewerFor(lia.id), { topicId: topico.id, text: "primeira", media: null });
    await createAnswer(viewerFor(jo.id), { topicId: topico.id, text: "segunda", media: null });

    const respostas = await respostasDoTopico(viewerFor(lia.id), topico.id, "antigas");
    expect(respostas?.map((r) => r.text)).toEqual(["primeira", "segunda"]);
  });
});

describe("marcar com #, * e @", () => {
  it("comunidade e tópico que existem viram link; o resto é texto", async () => {
    const { lia, jo, comunidade, topico } = await cenario();

    const outro = await createTopic(viewerFor(jo.id), {
      communityId: comunidade.id,
      name: "melhor set",
      description: "Qual?",
      media: null,
    });
    const vizinho = await db.topic.findUniqueOrThrow({ where: { id: outro!.id } });

    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: `olha @jo, isso é da #${comunidade.slug} e lembra *${vizinho.slug} — nada de #naoexiste`,
      media: null,
    });

    const [resposta] = (await respostasDoTopico(viewerFor(lia.id), topico.id)) ?? [];

    expect(resposta?.marcacoes.pessoas).toEqual(["jo"]);
    expect(resposta?.marcacoes.comunidades).toEqual([comunidade.slug]);
    expect(resposta?.marcacoes.topicos).toEqual([vizinho.slug]);
  });

  it("tópico de outra comunidade não vira link", async () => {
    const { lia, topico } = await cenario();

    // O `*` alcança só a comunidade desta resposta: o endereço de tópico é
    // único por comunidade, e um `*` de fora abriria o tópico errado.
    const outroUniverso = await makeUniverse("Barro");
    const outraComunidade = await db.community.create({
      data: {
        universeId: outroUniverso.id,
        name: "Cerâmica",
        nameNormalized: "Ceramica",
        intro: "i",
      },
    });
    const deFora = await db.topic.create({
      data: {
        communityId: outraComunidade.id,
        authorId: lia.id,
        name: "forno a lenha",
        slug: "forno-a-lenha",
        description: "Como?",
        cycleDate: new Date(),
      },
    });

    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: `tem isso em *${deFora.slug} também`,
      media: null,
    });

    const [resposta] = (await respostasDoTopico(viewerFor(lia.id), topico.id)) ?? [];
    expect(resposta?.marcacoes.topicos).toEqual([]);
  });

  it("marcar comunidade ou tópico não avisa ninguém", async () => {
    const { lia, jo, comunidade, topico } = await cenario();

    await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: `vem para a #${comunidade.slug}`,
      media: null,
    });

    // Referência não é convocação: avisar a comunidade inteira porque
    // alguém a citou seria a primeira fonte de barulho do Hub.
    expect(await db.notification.count({ where: { kind: "mention" } })).toBe(0);
    expect(lia.id).toBeTruthy();
  });
});
