/**
 * Comunidades (F07): RN04, RN06 e o que cada tela lista.
 *
 * Os três critérios de aceite da feature moram aqui.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  alternarFixada,
  minhasComunidades,
  paginaDaComunidade,
  topicosDaComunidade,
  trocarCapa,
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

  /*
   * Esta asserção era o contrário até 31 de outubro: "renomear muda o
   * endereço". Ela descrevia o que o gatilho fazia, não uma decisão — e
   * nada no produto renomeava comunidade, então ninguém tinha pensado no
   * assunto.
   *
   * A janela de moderar trouxe a primeira tela que renomeia, e aí a
   * consequência apareceu: o endereço é o link do convite (F14), e trocá-lo
   * quebraria tudo que já foi compartilhado. O Hub já diz isso em outro
   * lugar — "endereço que já existiu nunca volta a ser livre".
   */
  it("renomear NÃO muda o endereço: ele já foi compartilhado", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Vinil", eu);

    await db.community.update({ where: { id: comunidade.id }, data: { name: "Vinil Raro" } });
    const depois = await db.community.findUniqueOrThrow({ where: { id: comunidade.id } });

    expect(depois.slug).toBe("vinil");
    expect(depois.name).toBe("Vinil Raro");
  });

  it("endereço vazio é recalculado: é a saída de emergência que ficou", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await criar(universo.id, "Vinil", eu);

    await db.$executeRawUnsafe(
      `UPDATE communities SET name = 'Vinil Raro', slug = '' WHERE id = '${comunidade.id}'`,
    );
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

  it('RN18: o filtro "Seguindo" lista só os tópicos que a pessoa segue aqui', async () => {
    const { comunidade, antigo, dona } = await cenario();
    await followTopic(viewerFor(dona.id), antigo.id);

    const seguidos = await topicosDaComunidade(viewerFor(dona.id), comunidade.id, {
      filtro: "seguindo",
    });
    expect(seguidos.map((t) => t.name)).toEqual(["primeira festa"]);
    expect(seguidos[0]?.seguindo).toBe(true);
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

/**
 * RN03: a capa entra já na criação.
 *
 * Antes a comunidade nascia sempre com a capa padrão e quem criava
 * precisava descobrir o menu de três pontos para terminar o que estava
 * fazendo. O que o depósito devolve é **caminho**, não endereço, e é por
 * isso que `coverUrl` deixou de ser `z.url()`.
 */
describe("RN03: a capa na criação", () => {
  it("guarda o caminho do depósito que veio", async () => {
    const dona = await makeProfile();
    const universo = await makeUniverse();

    const criada = await createCommunity(viewerFor(dona.id), {
      universeId: universo.id,
      name: "Com capa",
      intro: "intro",
      coverUrl: "capas/abc-123.jpg",
    });

    const doBanco = await db.community.findUniqueOrThrow({ where: { id: criada!.id } });
    expect(doBanco.coverUrl).toBe("capas/abc-123.jpg");
  });

  it("sem capa, nasce com a padrão do Universo", async () => {
    const dona = await makeProfile();
    const universo = await makeUniverse();

    const criada = await createCommunity(viewerFor(dona.id), {
      universeId: universo.id,
      name: "Sem capa",
      intro: "intro",
      coverUrl: null,
    });

    const doBanco = await db.community.findUniqueOrThrow({ where: { id: criada!.id } });
    const doUniverso = await db.universe.findUniqueOrThrow({ where: { id: universo.id } });
    expect(doBanco.coverUrl).toBe(doUniverso.defaultCoverUrl);
  });
});

/*
 * RN35: comunidade que fica sem ninguém é excluída. Decisão do PO em 29 de
 * outubro, quando a confirmação de saída saiu da tela: sem ela, o moderador
 * sozinho sairia com um clique e deixaria um endereço que ninguém modera e
 * ninguém lê.
 */
describe("RN35: a comunidade sem ninguém é excluída", () => {
  it("sair sendo a última pessoa apaga a comunidade", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Som");
    const comunidade = await criar(universo.id, "Só Minha", eu);

    const { comunidadeApagada } = await leaveCommunity(viewerFor(eu.id), comunidade.id);
    expect(comunidadeApagada).toBe(true);

    const depois = await db.community.findUniqueOrThrow({ where: { id: comunidade.id } });
    expect(depois.deletedAt).not.toBeNull();
  });

  it("o endereço dela deixa de abrir", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Som");
    const comunidade = await criar(universo.id, "Some Depois", eu);

    await leaveCommunity(viewerFor(eu.id), comunidade.id);

    await expect(paginaDaComunidade(viewerFor(eu.id), comunidade.slug)).rejects.toThrow();
  });

  /*
   * RN06 continua valendo quando sobra gente: a moderação passa, e a
   * comunidade fica. É a ordem entre as duas regras que este caso guarda —
   * apagar primeiro deixaria a comunidade sumir com membros dentro.
   */
  it("com outra pessoa dentro, a comunidade fica e a moderação passa", async () => {
    const eu = await makeProfile();
    const outra = await makeProfile();
    const universo = await makeUniverse("Som");
    const comunidade = await criar(universo.id, "Continua Viva", eu);
    await joinCommunity(viewerFor(outra.id), comunidade.id);

    const { comunidadeApagada } = await leaveCommunity(viewerFor(eu.id), comunidade.id);
    expect(comunidadeApagada).toBe(false);

    const depois = await db.community.findUniqueOrThrow({ where: { id: comunidade.id } });
    expect(depois.deletedAt).toBeNull();

    const herdeira = await db.membership.findUniqueOrThrow({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: outra.id } },
    });
    expect(herdeira.role).toBe("moderator");
  });
});

/*
 * O enquadramento da capa. O que importa aqui é que imagem e enquadramento
 * andem juntos: em dois passos haveria uma janela em que a capa nova seria
 * desenhada com as medidas da antiga.
 */
describe("o enquadramento da capa", () => {
  const enquadramento = {
    coverWidth: 1600,
    coverHeight: 900,
    coverZoom: 1.5,
    coverAnchorX: 0.25,
    coverAnchorY: 0.75,
  };

  it("é guardado junto com a imagem, numa operação só", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Foto");
    const comunidade = await criar(universo.id, "Com Capa", eu);

    await trocarCapa(viewerFor(eu.id), comunidade.id, "capas/nova.jpg", enquadramento);

    const depois = await db.community.findUniqueOrThrow({ where: { id: comunidade.id } });
    expect(depois.coverUrl).toBe("capas/nova.jpg");
    expect(depois.coverWidth).toBe(1600);
    expect(depois.coverZoom).toBeCloseTo(1.5, 6);
    expect(depois.coverAnchorX).toBeCloseTo(0.25, 6);
  });

  it("chega à tela como medidas e âncora", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Foto");
    const comunidade = await criar(universo.id, "Na Tela", eu);
    await trocarCapa(viewerFor(eu.id), comunidade.id, "capas/nova.jpg", enquadramento);

    const pagina = await paginaDaComunidade(viewerFor(eu.id), comunidade.slug);
    expect(pagina.medidasDaCapa).toEqual({ largura: 1600, altura: 900 });
    expect(pagina.ancoraDaCapa.y).toBeCloseTo(0.75, 6);
  });

  /*
   * A capa que já existia, e a padrão do Universo, não têm medidas. Elas
   * precisam continuar sendo lidas — é o caminho que mantém o recorte
   * centralizado de antes desta rodada.
   */
  it("capa sem medidas continua sendo lida, e sem enquadramento", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Foto");
    const comunidade = await criar(universo.id, "Capa Antiga", eu);

    const pagina = await paginaDaComunidade(viewerFor(eu.id), comunidade.slug);
    expect(pagina.medidasDaCapa).toBeNull();
    expect(pagina.zoomDaCapa).toBe(1);
  });

  /*
   * O terceiro portão. A tela limita, o servidor reconfere — e o banco
   * recusa, que é o que vale quando alguém escreve direto nele.
   */
  it("o banco recusa zoom fora da faixa", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Foto");
    const comunidade = await criar(universo.id, "Zoom Demais", eu);

    await expect(
      prisma.$executeRaw`UPDATE communities SET cover_zoom = 5 WHERE id = ${comunidade.id}::uuid`,
    ).rejects.toThrow();
  });
});

/*
 * A tela mostra membros, tópicos, contribuições e a data. Os dois números
 * do meio são novos, e o segundo é o que tem pegadinha: `Answer` aponta
 * para `Topic`, nunca para `Community`.
 */
describe("os números da comunidade", () => {
  it("conta tópicos e contribuições, sem contar o que foi apagado", async () => {
    const eu = await makeProfile();
    const outra = await makeProfile();
    const universo = await makeUniverse("Conta");
    const comunidade = await criar(universo.id, "Com Numeros", eu);
    await joinCommunity(viewerFor(outra.id), comunidade.id);

    const topico = await createTopic(viewerFor(eu.id), {
      communityId: comunidade.id,
      name: "Primeiro",
      description: "Uma pergunta.",
    });
    await createAnswer(viewerFor(outra.id), { topicId: topico!.id, text: "Uma resposta." });

    const pagina = await paginaDaComunidade(viewerFor(eu.id), comunidade.slug);
    expect(pagina.topicosCount).toBe(1);
    expect(pagina.contribuicoesCount).toBe(1);
    expect(pagina.criadaEm).toBeInstanceOf(Date);
  });
});
