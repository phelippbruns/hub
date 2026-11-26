/**
 * A conversa por baixo do evento (RN38).
 *
 * O pedido do PO foi "eventos funcionando como tópicos, com uma área de
 * comentários dentro". A decisão: **o evento ganha um tópico por baixo,
 * invisível na lista.** Os comentários passam a ser contribuições de
 * verdade, e com isso estrela, imagem, GIF, `@`, RN14, RN16 e a fila de
 * moderação vêm de graça — é a mesma tabela.
 *
 * **Este arquivo é a verificação quase inteira do PR, e ele não tem tela.**
 * Foi escolha: o que mexeu aqui foram um gatilho e vinte pontos de leitura,
 * e tela esconde erro de regra. Uma lista que some por engano parece uma
 * lista vazia.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, joinAs, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import { criarEvento } from "./eventos";
import { hotTopicDeHoje, virarCiclo } from "./ciclo";
import { createTopic, enderecoDoTopico, topicoPorEndereco } from "./topics";
import { topicosDaComunidade } from "./comunidades";
import { buscarTopicos, topicosEmAlta } from "./descoberta";
import { respostasDoPerfil } from "./perfil";
import { viewerFor } from "./viewer";
import { NotFoundError } from "./errors";
import { TOPICOS_POR_DIA } from "@/lib/topicos";

beforeEach(resetDatabase);

const DAQUI_A_UMA_SEMANA = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

async function cenario() {
  const lia = await makeProfile({ handle: "lia", name: "Lia Souza" });
  const jo = await makeProfile({ handle: "jo", name: "Jo Ramos" });
  const universo = await makeUniverse("Hubverso de teste");
  const comunidade = await makeCommunity(universo.id, lia.id, "Animação");
  await joinAs(comunidade.id, jo.id);

  const evento = await criarEvento(viewerFor(lia.id), {
    communityId: comunidade.id,
    titulo: "Crítica de portfólio",
    descricao: "Cada pessoa mostra até 2 minutos.",
    formato: "online",
    comeca: DAQUI_A_UMA_SEMANA(),
    linkDoEncontro: "https://meet.exemplo.com/sala",
    vagas: null,
  });

  return { lia, jo, comunidade, evento };
}

/** A conversa daquele evento, lida direto da tabela. */
function conversaDe(eventId: string) {
  return db.topic.findFirst({ where: { eventId } });
}

describe("RN38: a conversa nasce com o evento", () => {
  it("criar evento cria a conversa, com o anfitrião como autor", async () => {
    const { lia, comunidade, evento } = await cenario();

    const conversa = await conversaDe(evento.id);

    expect(conversa, "o evento nasceu sem conversa").not.toBeNull();
    expect(conversa?.authorId, "o autor da conversa não é o anfitrião").toBe(lia.id);
    expect(conversa?.communityId).toBe(comunidade.id);
    expect(conversa?.name).toBe("Crítica de portfólio");
    expect(conversa?.description).toBe("Cada pessoa mostra até 2 minutos.");
  });

  it("evento sem descrição ganha uma abertura, porque a coluna não aceita vazio", async () => {
    const { lia, comunidade } = await cenario();

    const evento = await criarEvento(viewerFor(lia.id), {
      communityId: comunidade.id,
      titulo: "Café da manhã",
      descricao: "",
      formato: "presencial",
      local: "Padaria da esquina",
      comeca: DAQUI_A_UMA_SEMANA(),
      vagas: null,
    });

    const conversa = await conversaDe(evento.id);
    expect(conversa?.description).toBe("Combine aqui tudo sobre este encontro.");
  });

  it("o slug usa `:`, que nenhum nome digitado por gente alcança", async () => {
    const { evento } = await cenario();

    const conversa = await conversaDe(evento.id);

    expect(conversa?.slug).toBe(`evento:${evento.id}`);
  });

  it("uma conversa por evento, garantido por índice único", async () => {
    const { lia, comunidade, evento } = await cenario();

    await expect(
      db.topic.create({
        data: {
          communityId: comunidade.id,
          authorId: lia.id,
          name: "Segunda conversa do mesmo evento",
          description: "Não deveria existir.",
          eventId: evento.id,
          cycleDate: new Date(),
        },
      }),
      "o banco aceitou duas conversas para o mesmo evento",
    ).rejects.toThrow();
  });
});

describe("RN38: a conversa não aparece nas telas de tópico", () => {
  it("não entra na lista da comunidade", async () => {
    const { lia, comunidade } = await cenario();

    // Positivo primeiro: um tópico de verdade **aparece**. Sem isto, a
    // asserção abaixo passaria com a lista quebrada e vazia.
    await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "Qual o primeiro desenho que te marcou?",
      description: "Conta aí.",
    });

    const lista = await topicosDaComunidade(viewerFor(lia.id), comunidade.id);

    expect(lista.map((t) => t.name)).toEqual(["Qual o primeiro desenho que te marcou?"]);
  });

  it("não entra na busca de tópicos", async () => {
    const { lia, comunidade } = await cenario();
    await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "Crítica de portfólio para iniciantes",
      description: "Mesmo termo de propósito.",
    });

    const achados = await buscarTopicos(viewerFor(lia.id), "Crítica de portfólio");

    expect(achados.map((t) => t.name)).toEqual(["Crítica de portfólio para iniciantes"]);
  });

  it("não entra em tópicos em alta, nem com contribuições", async () => {
    const { lia, jo, evento } = await cenario();
    const conversa = await conversaDe(evento.id);

    // Contribuições na conversa, que é o que a colocaria em alta.
    await db.answer.createMany({
      data: [
        { topicId: conversa!.id, authorId: lia.id, text: "Levo meu portfólio." },
        { topicId: conversa!.id, authorId: jo.id, text: "Eu também." },
      ],
    });

    const alta = await topicosEmAlta(viewerFor(jo.id));

    expect(alta.map((t) => t.id)).not.toContain(conversa!.id);
  });

  it("não entra nas contribuições do perfil de quem marcou o evento", async () => {
    const { lia, comunidade } = await cenario();
    await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "Um tópico de verdade",
      description: "Para a lista não estar vazia.",
    });

    const contribuicoes = await respostasDoPerfil(viewerFor(lia.id), lia.id);

    expect(contribuicoes.map((c) => c.topico.nome)).toEqual(["Um tópico de verdade"]);
  });

  it("o endereço de tópico da conversa dá 404 — há um caminho só para ela", async () => {
    const { lia, comunidade, evento } = await cenario();
    const conversa = await conversaDe(evento.id);

    // Positivo primeiro: o endereço de um tópico comum **abre**.
    await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "Abre normalmente",
      description: "Para provar que a função funciona.",
    });
    await expect(
      topicoPorEndereco(viewerFor(lia.id), comunidade.slug, "abre-normalmente"),
    ).resolves.toBeTruthy();

    await expect(
      topicoPorEndereco(viewerFor(lia.id), comunidade.slug, conversa!.slug),
      "a conversa abriu por endereço de tópico",
    ).rejects.toThrow(NotFoundError);
  });

  it("traduzir o id da conversa devolve o endereço do **evento**", async () => {
    const { evento } = await cenario();
    const conversa = await conversaDe(evento.id);

    const endereco = await enderecoDoTopico(conversa!.id);

    expect(endereco).toContain(`evento=${evento.id}`);
    expect(endereco, "o endereço levou ao painel de tópico, que não abre").not.toContain("?t=");
  });
});

describe("RN07: o evento não gasta vaga do limite diário", () => {
  it("três eventos e dez tópicos no mesmo dia, todos aceitos", async () => {
    const { lia, comunidade } = await cenario();

    // Mais dois eventos, somando três com o do cenário.
    for (const titulo of ["Segundo encontro", "Terceiro encontro"]) {
      await criarEvento(viewerFor(lia.id), {
        communityId: comunidade.id,
        titulo,
        descricao: "",
        formato: "online",
        comeca: DAQUI_A_UMA_SEMANA(),
        linkDoEncontro: "https://meet.exemplo.com/sala",
        vagas: null,
      });
    }

    for (let i = 1; i <= TOPICOS_POR_DIA; i += 1) {
      await createTopic(viewerFor(lia.id), {
        communityId: comunidade.id,
        name: `Assunto número ${i}`,
        description: "Dentro da cota do dia.",
      });
    }

    // E a cota está cheia agora, não antes: o limite continua existindo.
    await expect(
      createTopic(viewerFor(lia.id), {
        communityId: comunidade.id,
        name: "O décimo primeiro",
        description: "Este tem de ser recusado.",
      }),
      "o limite da RN07 parou de valer",
    ).rejects.toThrow();
  });
});

describe("RN38: o evento é dono do texto", () => {
  it("mudar o título atualiza a cópia e **não** muda o slug", async () => {
    const { evento } = await cenario();
    const antes = await conversaDe(evento.id);

    await db.event.update({
      where: { id: evento.id },
      data: { title: "Crítica de portfólio — turma da tarde" },
    });

    const depois = await conversaDe(evento.id);
    expect(depois?.name).toBe("Crítica de portfólio — turma da tarde");
    expect(depois?.slug, "o endereço da conversa mudou com o título").toBe(antes?.slug);
  });

  it("apagar o evento esconde a conversa e, com ela, os comentários", async () => {
    const { lia, evento } = await cenario();
    const conversa = await conversaDe(evento.id);
    await db.answer.create({
      data: { topicId: conversa!.id, authorId: lia.id, text: "Vou levar três peças." },
    });

    await db.event.update({ where: { id: evento.id }, data: { deletedAt: new Date() } });

    const depois = await conversaDe(evento.id);
    expect(depois?.deletedAt, "a conversa continuou visível sem o evento").not.toBeNull();
  });

  it("e desfazer o apagar traz a conversa de volta", async () => {
    // A cascata é de mão dupla de propósito: de mão única, um desfazer
    // deixaria a conversa escondida para sempre.
    const { evento } = await cenario();
    await db.event.update({ where: { id: evento.id }, data: { deletedAt: new Date() } });
    await db.event.update({ where: { id: evento.id }, data: { deletedAt: null } });

    const depois = await conversaDe(evento.id);
    expect(depois?.deletedAt).toBeNull();
  });
});

/**
 * **O ciclo das 00h e a conversa do evento.**
 *
 * Decisão do PO: encontro que gera conversa é movimento, e movimento é o que
 * o ciclo mede. A conversa **concorre** ao destaque como qualquer tópico.
 *
 * Mas a exibição é outra coisa, e aqui está a diferença que custou a decisão
 * mais difícil deste PR: o cartão do destaque leva a `/c/<com>?t=<slug>`, e o
 * slug da conversa é `evento:<id>` — um painel que não abre. Então, **até o
 * cartão saber apontar para o evento, ele não mostra a conversa.**
 *
 * Os dois testes abaixo medem os dois lados, de propósito: a eleição
 * acontece, e a vitrine espera. Soltar a vitrine antes do endereço seria
 * entregar um destaque que não leva a lugar nenhum.
 */
describe("RN09: a conversa concorre ao Hot Topic, e a vitrine espera o endereço", () => {
  async function conversaVencendoOCiclo() {
    const { lia, jo, comunidade, evento } = await cenario();
    const conversa = await conversaDe(evento.id);

    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);

    // Um tópico comum com uma pessoa respondendo.
    const comum = await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "Um assunto qualquer",
      description: "Com menos gente que o encontro.",
    });
    await db.answer.create({
      data: { topicId: comum!.id, authorId: lia.id, text: "só eu", createdAt: ontem },
    });

    // E a conversa do evento com duas pessoas diferentes: ela vence.
    await db.answer.createMany({
      data: [
        { topicId: conversa!.id, authorId: lia.id, text: "levo o portfólio", createdAt: ontem },
        { topicId: conversa!.id, authorId: jo.id, text: "eu também", createdAt: ontem },
      ],
    });

    const dia = await db.$queryRaw<{ dia: Date }[]>`
      SELECT hub_cycle_date(${ontem}::timestamptz) AS dia
    `;
    await virarCiclo(new Date(dia[0]!.dia.toISOString().slice(0, 10)));

    return { comunidade, conversa: conversa!, comum: comum!, evento };
  }

  it("a eleição escolhe a conversa quando ela tem mais pessoas diferentes", async () => {
    const { comunidade, conversa } = await conversaVencendoOCiclo();

    const eleito = await db.hotTopic.findFirst({ where: { communityId: comunidade.id } });

    expect(eleito, "o ciclo não elegeu ninguém").not.toBeNull();
    expect(eleito?.topicId, "a conversa do evento foi excluída da disputa").toBe(conversa.id);
  });

  it("mas o cartão do destaque não a mostra, porque o endereço dela não abre", async () => {
    const { comunidade } = await conversaVencendoOCiclo();

    const naTela = await hotTopicDeHoje(comunidade.id);

    expect(
      naTela,
      "o destaque mostrou a conversa, e o cartão levaria a um painel vazio",
    ).toBeNull();
  });
});
