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
import { criarEvento, eventosDaComunidade } from "./eventos";
import { hotTopicDeHoje, virarCiclo } from "./ciclo";
import { hotTopicsParaMim } from "./inicio";
import {
  conversaDoEvento,
  createAnswer,
  createTopic,
  enderecoDoTopico,
  respostasDoTopico,
  topicoPorEndereco,
} from "./topics";
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
 * A exibição esperou um PR. O cartão do destaque levava a `/c/<com>?t=<slug>`,
 * e o slug da conversa é `evento:<id>` — um painel que não abre. Então, até o
 * cartão saber apontar para o encontro, ele não mostrava a conversa: o
 * invariante do PR 3 era **em nenhum commit o Hub mostra um link que não
 * abre**.
 *
 * Em 26 de novembro de 2026 a espera acabou. `event_id` sai nas duas
 * consultas de destaque e `enderecoDeConversa` escolhe o endereço, então os
 * testes abaixo medem o outro lado: a eleição escolhe a conversa **e** a
 * vitrine a mostra, com o id do encontro para o cartão saber para onde ir.
 */
describe("RN09: a conversa concorre ao Hot Topic, e a vitrine leva ao encontro", () => {
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

    return { lia, jo, comunidade, conversa: conversa!, comum: comum!, evento };
  }

  it("a eleição escolhe a conversa quando ela tem mais pessoas diferentes", async () => {
    const { comunidade, conversa } = await conversaVencendoOCiclo();

    const eleito = await db.hotTopic.findFirst({ where: { communityId: comunidade.id } });

    expect(eleito, "o ciclo não elegeu ninguém").not.toBeNull();
    expect(eleito?.topicId, "a conversa do evento foi excluída da disputa").toBe(conversa.id);
  });

  it("o cartão da comunidade a mostra, com o id do encontro para o endereço", async () => {
    const { comunidade, conversa, evento } = await conversaVencendoOCiclo();

    const naTela = await hotTopicDeHoje(comunidade.id);

    expect(naTela, "o destaque do dia desapareceu da comunidade").not.toBeNull();
    expect(naTela?.id).toBe(conversa.id);
    /*
     * **É este campo que faz o cartão levar a algum lugar.** Sem ele,
     * `enderecoDeConversa` cai no ramo do tópico e monta `?t=evento:<id>` —
     * um endereço que abre a comunidade sem painel nenhum, sem erro no
     * servidor e sem jornada vermelha.
     */
    expect(naTela?.eventoId, "o cartão não sabe que o destaque é um encontro").toBe(evento.id);
  });

  it("e no Início também, com o id do encontro", async () => {
    const { lia, conversa, evento } = await conversaVencendoOCiclo();

    const destaques = await hotTopicsParaMim(viewerFor(lia.id));

    const dela = destaques.find((d) => d.topicId === conversa.id);
    expect(dela, "o destaque do encontro não chegou ao Início").toBeDefined();
    expect(dela?.eventoId).toBe(evento.id);
  });

  it("o destaque de um tópico comum continua sem evento nenhum", async () => {
    // A barreira positiva do par: se `eventoId` viesse preenchido sempre, os
    // dois testes acima passariam e **todo** cartão iria para a aba Eventos.
    const { lia, jo, comunidade } = await cenario();
    const ontem = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const comum = await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "Só um assunto",
      description: "Sem encontro por baixo.",
    });
    await db.answer.createMany({
      data: [
        { topicId: comum!.id, authorId: lia.id, text: "eu", createdAt: ontem },
        { topicId: comum!.id, authorId: jo.id, text: "e eu", createdAt: ontem },
      ],
    });
    const dia = await db.$queryRaw<{ dia: Date }[]>`
      SELECT hub_cycle_date(${ontem}::timestamptz) AS dia
    `;
    await virarCiclo(new Date(dia[0]!.dia.toISOString().slice(0, 10)));

    const naTela = await hotTopicDeHoje(comunidade.id);

    expect(naTela?.id).toBe(comum!.id);
    expect(naTela?.eventoId, "um tópico comum virou encontro no endereço").toBeNull();
  });
});

/**
 * **A área de comentários do encontro** (PR 4).
 *
 * O que estes testes medem não é uma feature nova: é que a decisão do Bloco 3
 * pagou. A conversa é um tópico de verdade, então comentar num encontro é
 * `createAnswer` — e com isso estrela (RN15), imagem, GIF, `@`, "não se
 * edita" (RN14), o bloqueio de links (RN16) e a fila de moderação valem ali
 * sem nenhuma linha escrita de novo.
 *
 * A porta é `conversaDoEvento`, e ela é a **única**: `topicoPorEndereco`
 * recusa a conversa de propósito, e os testes acima medem essa recusa.
 */
describe("RN38: comentar num encontro", () => {
  it("a conversa abre pelo id do evento, que é o caminho que existe", async () => {
    const { lia, evento } = await cenario();

    const conversa = await conversaDoEvento(viewerFor(lia.id), evento.id);

    expect(conversa.name).toBe("Crítica de portfólio");
    expect(conversa.eventId).toBe(evento.id);
    // RN16: quem tem conta vê as contribuições. É o que liga o compositor.
    expect(conversa.podeVerRespostas).toBe(true);
  });

  it("o comentário entra como contribuição, e conta no cabeçalho", async () => {
    const { lia, jo, evento } = await cenario();
    const conversa = await conversaDoEvento(viewerFor(lia.id), evento.id);

    await createAnswer(viewerFor(jo.id), {
      topicId: conversa.id,
      text: "Levo três peças.",
      media: null,
    });

    const depois = await conversaDoEvento(viewerFor(lia.id), evento.id);
    expect(depois.answerCount).toBe(1);
    expect(depois.peopleCount).toBe(1);

    const pagina = await respostasDoTopico(viewerFor(lia.id), conversa.id);
    expect(pagina?.respostas.map((r) => r.text)).toEqual(["Levo três peças."]);
  });

  it("RN16: o comentário com link é recusado, como em qualquer contribuição", async () => {
    const { lia, jo, evento } = await cenario();
    const conversa = await conversaDoEvento(viewerFor(lia.id), evento.id);

    await expect(
      createAnswer(viewerFor(jo.id), {
        topicId: conversa.id,
        text: "entra aqui https://exemplo.com",
        media: null,
      }),
      "o encontro virou o canto do Hub onde link passa",
    ).rejects.toThrow();
  });

  it("quem não é membro da comunidade não comenta no encontro dela", async () => {
    const { lia, evento } = await cenario();
    const conversa = await conversaDoEvento(viewerFor(lia.id), evento.id);
    const estranho = await makeProfile({ handle: "zz", name: "Zé Zê" });

    await expect(
      createAnswer(viewerFor(estranho.id), {
        topicId: conversa.id,
        text: "oi",
        media: null,
      }),
      "a área de comentários do encontro ignorou a participação na comunidade",
    ).rejects.toThrow();
  });

  it("comentar não faz a conversa aparecer na lista da comunidade", async () => {
    // O comentário é contribuição de verdade — e continua não sendo assunto.
    const { lia, jo, comunidade, evento } = await cenario();
    const conversa = await conversaDoEvento(viewerFor(lia.id), evento.id);

    await createAnswer(viewerFor(jo.id), {
      topicId: conversa.id,
      text: "combinado",
      media: null,
    });

    const lista = await topicosDaComunidade(viewerFor(lia.id), comunidade.id, {
      filtro: "alta",
      termo: "",
    });
    expect(lista.map((t) => t.id)).not.toContain(conversa.id);
  });

  it("evento apagado não tem mais área de comentários", async () => {
    const { lia, evento } = await cenario();

    await db.event.update({ where: { id: evento.id }, data: { deletedAt: new Date() } });

    await expect(
      conversaDoEvento(viewerFor(lia.id), evento.id),
      "a conversa de um encontro apagado continuou abrindo",
    ).rejects.toThrow(NotFoundError);
  });

  it("o cartão do encontro sabe quantos comentários tem", async () => {
    /*
     * O número é o que faz a porta valer o clique — um link dizendo
     * "Comentários" que abre o vazio não convida ninguém. E ele sai da
     * **mesma** consulta da lista, agrupado: dez encontros na aba não podem
     * custar dez idas ao banco para desenhar dez números.
     */
    const { lia, jo, comunidade, evento } = await cenario();
    const conversa = await conversaDoEvento(viewerFor(lia.id), evento.id);

    const antes = await eventosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(antes.find((e) => e.id === evento.id)?.comentarios).toBe(0);

    await createAnswer(viewerFor(jo.id), { topicId: conversa.id, text: "eu vou", media: null });
    await createAnswer(viewerFor(lia.id), { topicId: conversa.id, text: "ótimo", media: null });

    const depois = await eventosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(depois.find((e) => e.id === evento.id)?.comentarios).toBe(2);
  });

  it("comentário apagado sai da conta", async () => {
    const { lia, jo, comunidade, evento } = await cenario();
    const conversa = await conversaDoEvento(viewerFor(lia.id), evento.id);

    await createAnswer(viewerFor(jo.id), { topicId: conversa.id, text: "some", media: null });
    await db.answer.updateMany({
      where: { topicId: conversa.id },
      data: { deletedAt: new Date() },
    });

    const lista = await eventosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(lista.find((e) => e.id === evento.id)?.comentarios).toBe(0);
  });

  it("id inventado não abre conversa nenhuma", async () => {
    const { lia } = await cenario();

    await expect(
      conversaDoEvento(viewerFor(lia.id), "00000000-0000-0000-0000-000000000000"),
    ).rejects.toThrow(NotFoundError);
  });
});
