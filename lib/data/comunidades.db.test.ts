/**
 * Comunidades (F07): RN04, RN06 e o que cada tela lista.
 *
 * Os três critérios de aceite da feature moram aqui.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  alternarFixada,
  definirPainelOculto,
  emAltaAgora,
  minhasComunidades,
  paginaDaComunidade,
  painelEstaOculto,
  topicosDaComunidade,
  topicosQueSigoAqui,
} from "./comunidades";
import {
  comunidadeComOMesmoNome,
  createCommunity,
  escolherHerdeiroDaModeracao,
  joinCommunity,
  leaveCommunity,
} from "./communities";
import { createAnswer, createTopic } from "./topics";
import { followTopic } from "./follows";
import { prisma } from "./prisma";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

/** Cria uma comunidade pelo caminho do produto, e devolve o que o banco guardou. */
async function criar(universeId: string, nome: string, dona: { id: string }) {
  const criada = await createCommunity(viewerFor(dona.id), {
    universeId,
    name: nome,
    intro: "Uma intro qualquer.",
    coverUrl: null,
  });
  return db.community.findUniqueOrThrow({ where: { id: criada!.id } });
}

describe("o endereço da comunidade", () => {
  it("vem do nome, sem acento e sem símbolo", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");

    const comunidade = await criar(universo.id, "Música Eletrônica", eu);
    expect(comunidade.slug).toBe("musica-eletronica");
  });

  it("nomes diferentes que dariam o mesmo endereço ganham número", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");

    /*
     * A RN04 apaga os símbolos sem pôr nada no lugar, então "Rock&Roll" vira
     * "rockroll" e "Rock Roll" vira "rock roll" — nomes diferentes para ela.
     * O endereço, que troca símbolo por hífen, daria "rock-roll" nos dois.
     */
    const primeira = await criar(universo.id, "Rock Roll", eu);
    const segunda = await criar(universo.id, "Rock&Roll", eu);

    expect(primeira.slug).toBe("rock-roll");
    expect(segunda.slug).toBe("rock-roll-2");
  });

  it("renomear muda o endereço", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Vinil", eu);

    await db.community.update({ where: { id: comunidade.id }, data: { name: "Vinil Raro" } });
    const depois = await db.community.findUniqueOrThrow({ where: { id: comunidade.id } });

    expect(depois.slug).toBe("vinil-raro");
  });
});

describe("RN04: duas comunidades não têm o mesmo nome", () => {
  it.each([
    ["Fotografias de Paisagem", "o plural"],
    ["fotografia de paisagem", "as maiúsculas"],
    ["Fotografia  de  Paisagem", "os espaços"],
    ["Fotográfia de Paisagem", "o acento"],
  ])("recusa %s, porque a comparação ignora %s", async (nome) => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Fotografia");
    await criar(universo.id, "Fotografia de Paisagem", eu);

    await expect(
      createCommunity(viewerFor(eu.id), {
        universeId: universo.id,
        name: nome,
        intro: "Outra intro.",
        coverUrl: null,
      }),
    ).rejects.toThrow(/RN04|já existe/i);
  });

  it("a mensagem consegue nomear a comunidade que já existe", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Fotografia");
    await criar(universo.id, "Fotografia de Paisagem", eu);

    // É o que o protótipo manda mostrar: "Já existe Fotografia de Paisagem.
    // Entre nela ou escolha outro nome." Sem o nome, a pessoa fica adivinhando.
    const existente = await comunidadeComOMesmoNome("Fotografias de Paisagem");
    expect(existente?.name).toBe("Fotografia de Paisagem");
    expect(existente?.slug).toBe("fotografia-de-paisagem");
  });

  it("nome livre não acha nada", async () => {
    expect(await comunidadeComOMesmoNome("Assunto Inédito")).toBeNull();
  });
});

describe("RN06: a comunidade nunca fica sem moderador", () => {
  it("quem cria vira moderador", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Minha Comunidade", eu);

    const minha = await db.membership.findUniqueOrThrow({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: eu.id } },
    });
    expect(minha.role).toBe("moderator");
  });

  it("o moderador que sai transfere a moderação", async () => {
    const dona = await makeProfile();
    const outra = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Com Herdeira", dona);
    await joinCommunity(viewerFor(outra.id), comunidade.id);

    await leaveCommunity(viewerFor(dona.id), comunidade.id);

    const herdeira = await db.membership.findUniqueOrThrow({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: outra.id } },
    });
    expect(herdeira.role).toBe("moderator");
  });

  it("com outro moderador de pé, ninguém é promovido", async () => {
    const dona = await makeProfile();
    const comoderadora = await makeProfile();
    const membro = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Dois Moderadores", dona);

    await joinCommunity(viewerFor(comoderadora.id), comunidade.id);
    await joinCommunity(viewerFor(membro.id), comunidade.id);
    await db.membership.update({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: comoderadora.id } },
      data: { role: "moderator" },
    });

    await leaveCommunity(viewerFor(dona.id), comunidade.id);

    const dele = await db.membership.findUniqueOrThrow({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: membro.id } },
    });
    expect(dele.role).toBe("member");
  });

  it("a última pessoa pode sair, e a comunidade fica sem ninguém", async () => {
    const dona = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Só Eu", dona);

    await expect(leaveCommunity(viewerFor(dona.id), comunidade.id)).resolves.not.toThrow();
    expect(await db.membership.count({ where: { communityId: comunidade.id } })).toBe(0);
  });
});

describe("RN06: quem herda a moderação", () => {
  it("é quem mais respondeu nos últimos 30 dias", async () => {
    const dona = await makeProfile();
    const quieta = await makeProfile();
    const ativa = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Com Ativa", dona);

    // A quieta entra primeiro: sem o critério de atividade, ela herdaria.
    await joinCommunity(viewerFor(quieta.id), comunidade.id);
    await joinCommunity(viewerFor(ativa.id), comunidade.id);

    const topico = await createTopic(viewerFor(dona.id), {
      communityId: comunidade.id,
      name: "assunto",
      description: "abertura",
      media: null,
    });
    await createAnswer(viewerFor(ativa.id), {
      topicId: topico!.id,
      text: "respondi aqui",
      media: null,
    });

    expect(await escolherHerdeiroDaModeracao(prisma, comunidade.id)).toBe(ativa.id);
  });

  it("sem ninguém ativo, é o membro mais antigo", async () => {
    const dona = await makeProfile();
    const antiga = await makeProfile();
    const nova = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Sem Atividade", dona);

    await joinCommunity(viewerFor(antiga.id), comunidade.id);
    await joinCommunity(viewerFor(nova.id), comunidade.id);

    // A dona entrou antes de todas: é ela a mais antiga enquanto está dentro.
    expect(await escolherHerdeiroDaModeracao(prisma, comunidade.id)).toBe(dona.id);
  });

  it("comunidade vazia não tem herdeiro, e isso não é erro", async () => {
    const universo = await makeUniverse("Música");
    const comunidade = await db.community.create({
      data: { universeId: universo.id, name: "Vazia", nameNormalized: "vazia", intro: "i" },
    });

    expect(await escolherHerdeiroDaModeracao(prisma, comunidade.id)).toBeNull();
  });
});

describe("a página da comunidade", () => {
  it("mostra membros, Universo e quem modera", async () => {
    const dona = await makeProfile({ name: "Lia Souza" });
    const visitante = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Música Eletrônica", dona);

    const pagina = await paginaDaComunidade(viewerFor(visitante.id), comunidade.slug);

    expect(pagina.name).toBe("Música Eletrônica");
    expect(pagina.membersCount).toBe(1);
    expect(pagina.universo.name).toBe("Música");
    expect(pagina.moderadores.map((m) => m.name)).toEqual(["Lia Souza"]);
    expect(pagina.souMembro).toBe(false);
    expect(pagina.souModerador).toBe(false);
  });

  it("quem criou se vê como membro e moderador", async () => {
    const dona = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Minha", dona);

    const pagina = await paginaDaComunidade(viewerFor(dona.id), comunidade.slug);
    expect(pagina.souMembro).toBe(true);
    expect(pagina.souModerador).toBe(true);
  });

  it("endereço que não existe não devolve uma página vazia", async () => {
    const eu = await makeProfile();
    await expect(paginaDaComunidade(viewerFor(eu.id), "nao-existe")).rejects.toThrow();
  });
});

describe("os tópicos da comunidade", () => {
  /** Uma comunidade com dois tópicos: um com mais respostas, outro mais novo. */
  async function cenario() {
    const dona = await makeProfile();
    const outra = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Com Tópicos", dona);
    await joinCommunity(viewerFor(outra.id), comunidade.id);

    const antigo = await createTopic(viewerFor(dona.id), {
      communityId: comunidade.id,
      name: "primeira festa",
      description: "Como foi?",
      media: null,
    });
    for (const quem of [dona, outra]) {
      await createAnswer(viewerFor(quem.id), {
        topicId: antigo!.id,
        text: `resposta de ${quem.id}`,
        media: null,
      });
    }

    // RN07 limita a um tópico por pessoa por dia em cada comunidade, então o
    // segundo tópico vem da outra pessoa.
    const novo = await createTopic(viewerFor(outra.id), {
      communityId: comunidade.id,
      name: "música de pista",
      description: "Qual te marcou?",
      media: null,
    });

    return { comunidade, antigo: antigo!, novo: novo!, dona, outra };
  }

  it("a ordem padrão é por mais respostas", async () => {
    const { comunidade, dona } = await cenario();

    const lista = await topicosDaComunidade(viewerFor(dona.id), comunidade.id);
    expect(lista.map((t) => t.name)).toEqual(["primeira festa", "música de pista"]);
  });

  it("por recentes, o mais novo vem primeiro", async () => {
    const { comunidade, dona } = await cenario();

    const lista = await topicosDaComunidade(viewerFor(dona.id), comunidade.id, {
      ordem: "recentes",
    });
    expect(lista.map((t) => t.name)).toEqual(["música de pista", "primeira festa"]);
  });

  it("RN15: cada linha traz pessoas e respostas, nunca um placar", async () => {
    const { comunidade, dona } = await cenario();

    const [primeiro] = await topicosDaComunidade(viewerFor(dona.id), comunidade.id);
    expect(primeiro?.pessoas).toBe(2);
    expect(primeiro?.respostas).toBe(2);
  });

  it("a busca dentro da comunidade ignora acento", async () => {
    const { comunidade, dona } = await cenario();

    const lista = await topicosDaComunidade(viewerFor(dona.id), comunidade.id, {
      termo: "musica",
    });
    expect(lista.map((t) => t.name)).toEqual(["música de pista"]);
  });

  it("o painel lista só os tópicos que a pessoa segue ali", async () => {
    const { comunidade, antigo, dona } = await cenario();
    await followTopic(viewerFor(dona.id), antigo.id);

    const seguidos = await topicosQueSigoAqui(viewerFor(dona.id), comunidade.id);
    expect(seguidos.map((t) => t.name)).toEqual(["primeira festa"]);
  });

  it('"Em alta agora" é o tópico com mais pessoas diferentes hoje', async () => {
    const { comunidade } = await cenario();

    const destaque = await emAltaAgora(comunidade.id);
    expect(destaque?.name).toBe("primeira festa");
    expect(destaque?.pessoas).toBe(2);
  });

  it("sem resposta nenhuma hoje, não há destaque", async () => {
    const dona = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Caladona", dona);
    await createTopic(viewerFor(dona.id), {
      communityId: comunidade.id,
      name: "ninguém respondeu",
      description: "Alô?",
      media: null,
    });

    expect(await emAltaAgora(comunidade.id)).toBeNull();
  });
});

describe("Minhas Comunidades", () => {
  async function tres(dona: { id: string }, universeId: string) {
    const nomes = ["Vinil", "Analógica", "Terror"];
    const criadas = [];
    for (const nome of nomes) criadas.push(await criar(universeId, nome, dona));
    return criadas;
  }

  it("lista em ordem alfabética, com acento no lugar certo", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    await tres(eu, universo.id);

    const lista = await minhasComunidades(viewerFor(eu.id));
    expect(lista.map((c) => c.name)).toEqual(["Analógica", "Terror", "Vinil"]);
  });

  it("não lista comunidade de que a pessoa não participa", async () => {
    const eu = await makeProfile();
    const outra = await makeProfile();
    const universo = await makeUniverse("Música");
    await criar(universo.id, "Dela", outra);

    expect(await minhasComunidades(viewerFor(eu.id))).toEqual([]);
  });

  it("a fixada sobe para o topo, fora da ordem alfabética", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const [vinil] = await tres(eu, universo.id);

    await alternarFixada(viewerFor(eu.id), vinil!.id, true);

    const lista = await minhasComunidades(viewerFor(eu.id));
    expect(lista.map((c) => c.name)).toEqual(["Vinil", "Analógica", "Terror"]);
    expect(lista[0]?.fixada).toBe(true);
  });

  it("desafixar devolve a comunidade à ordem alfabética", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const [vinil] = await tres(eu, universo.id);

    await alternarFixada(viewerFor(eu.id), vinil!.id, true);
    await alternarFixada(viewerFor(eu.id), vinil!.id, false);

    const lista = await minhasComunidades(viewerFor(eu.id));
    expect(lista.map((c) => c.name)).toEqual(["Analógica", "Terror", "Vinil"]);
  });

  it("não dá para fixar comunidade de que não se participa", async () => {
    const eu = await makeProfile();
    const outra = await makeProfile();
    const universo = await makeUniverse("Música");
    const dela = await criar(universo.id, "Dela", outra);

    await expect(alternarFixada(viewerFor(eu.id), dela.id, true)).rejects.toThrow();
  });

  it("a busca filtra sem acento", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    await tres(eu, universo.id);

    const lista = await minhasComunidades(viewerFor(eu.id), { termo: "analogica" });
    expect(lista.map((c) => c.name)).toEqual(["Analógica"]);
  });

  it("conta como ativo o tópico que recebeu resposta hoje", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Movimentada", eu);

    const topico = await createTopic(viewerFor(eu.id), {
      communityId: comunidade.id,
      name: "assunto",
      description: "abertura",
      media: null,
    });

    const antes = await minhasComunidades(viewerFor(eu.id));
    expect(antes[0]?.topicosAtivos).toBe(0);

    await createAnswer(viewerFor(eu.id), { topicId: topico!.id, text: "oi", media: null });

    const depois = await minhasComunidades(viewerFor(eu.id));
    expect(depois[0]?.topicosAtivos).toBe(1);
  });
});

describe("a preferência do painel", () => {
  it("fica na pessoa, e começa visível", async () => {
    const eu = await makeProfile();
    expect(await painelEstaOculto(viewerFor(eu.id))).toBe(false);

    await definirPainelOculto(viewerFor(eu.id), true);
    expect(await painelEstaOculto(viewerFor(eu.id))).toBe(true);
  });

  it("é de cada pessoa, não do Hub", async () => {
    const eu = await makeProfile();
    const outra = await makeProfile();

    await definirPainelOculto(viewerFor(eu.id), true);
    expect(await painelEstaOculto(viewerFor(outra.id))).toBe(false);
  });
});
