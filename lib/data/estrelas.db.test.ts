/**
 * RN15: a estrela da contribuição.
 *
 * A RN15 dizia "não há curtidas nem contador por resposta". O PO virou a
 * regra em 5 de novembro de 2026, e a virada está em `docs/vacilos.md`.
 * Estes testes guardam os **limites** com que ela entrou — são eles que
 * fazem a estrela não virar o contador de popularidade que o Princípio 2
 * recusa.
 *
 * Tudo aqui passa pela função de dados ou pelo banco, nunca pela tela: é
 * onde a regra mora. O que a tela faz com o número está nas jornadas.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { asViewer, db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  alternarEstrela,
  createAnswer,
  createTopic,
  deleteAnswer,
  ESTRELAS_POR_MINUTO,
  respostasDoTopico,
} from "./topics";
import { createCommunity, joinCommunity } from "./communities";
import { viewerFor } from "./viewer";
import { bloquear } from "./perfil";

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

  const contribuicao = await createAnswer(viewerFor(jo.id), {
    topicId: topico.id,
    text: "Foi num galpão em Curitiba.",
    media: null,
  });

  return { lia, jo, comunidade, topico, contribuicao };
}

const estrelas = (answerId: string) =>
  db.answer.findUniqueOrThrow({ where: { id: answerId }, select: { starCount: true } });

describe("RN15: uma estrela por pessoa", () => {
  it("RN15: dar estrela cria a linha e sobe o contador", async () => {
    const { lia, contribuicao } = await cenario();

    const resultado = await alternarEstrela(viewerFor(lia.id), contribuicao.id);

    expect(resultado).toEqual({ estrelada: true, total: 1 });
    expect((await estrelas(contribuicao.id)).starCount).toBe(1);
  });

  it("RN15: dar de novo retira", async () => {
    const { lia, contribuicao } = await cenario();

    await alternarEstrela(viewerFor(lia.id), contribuicao.id);
    const segunda = await alternarEstrela(viewerFor(lia.id), contribuicao.id);

    expect(segunda).toEqual({ estrelada: false, total: 0 });
    expect(await db.answerStar.count({ where: { answerId: contribuicao.id } })).toBe(0);
  });

  it("RN15: a mesma pessoa nunca tem duas linhas, nem com dois cliques no mesmo instante", async () => {
    const { lia, contribuicao } = await cenario();

    /*
     * A chave primária composta **é** a regra. Inserir direto, por fora da
     * função de dados, é o que prova isso: se a unicidade dependesse de um
     * `if` no TypeScript, este teste passaria sem ela existir no banco.
     */
    await db.answerStar.create({ data: { answerId: contribuicao.id, profileId: lia.id } });
    await expect(
      db.answerStar.create({ data: { answerId: contribuicao.id, profileId: lia.id } }),
    ).rejects.toThrow();

    expect((await estrelas(contribuicao.id)).starCount).toBe(1);
  });

  it("RN15: o contador bate com o número de linhas depois de dar e tirar", async () => {
    const { lia, jo, contribuicao, comunidade } = await cenario();
    const rui = await makeProfile({ name: "Rui Prates", handle: "rui" });
    await joinCommunity(viewerFor(rui.id), comunidade.id);

    await alternarEstrela(viewerFor(lia.id), contribuicao.id);
    await alternarEstrela(viewerFor(jo.id), contribuicao.id);
    await alternarEstrela(viewerFor(rui.id), contribuicao.id);
    await alternarEstrela(viewerFor(jo.id), contribuicao.id); // tirou

    expect((await estrelas(contribuicao.id)).starCount).toBe(2);
    expect(await db.answerStar.count({ where: { answerId: contribuicao.id } })).toBe(2);
  });

  it("RN15: dá para dar estrela na própria contribuição", async () => {
    const { jo, contribuicao } = await cenario();

    // Decisão do PO, item 2.2. Contraria o instinto, e por isso tem teste:
    // sem ele, alguém "consertaria" isto na primeira revisão.
    await expect(alternarEstrela(viewerFor(jo.id), contribuicao.id)).resolves.toEqual({
      estrelada: true,
      total: 1,
    });
  });
});

describe("RN15: quem pode dar estrela", () => {
  it("RN15: quem não é membro da comunidade não dá", async () => {
    const { contribuicao } = await cenario();
    const estranha = await makeProfile({ handle: "estranha" });

    await expect(alternarEstrela(viewerFor(estranha.id), contribuicao.id)).rejects.toThrow();
    expect((await estrelas(contribuicao.id)).starCount).toBe(0);
  });

  it("RN26: quem bloqueou não dá estrela em quem bloqueou", async () => {
    const { lia, jo, contribuicao } = await cenario();
    await bloquear(viewerFor(lia.id), jo.id);

    await expect(alternarEstrela(viewerFor(lia.id), contribuicao.id)).rejects.toThrow();
  });

  it("RN15: contribuição apagada não recebe estrela", async () => {
    const { lia, jo, contribuicao } = await cenario();
    await deleteAnswer(viewerFor(jo.id), contribuicao.id);

    await expect(alternarEstrela(viewerFor(lia.id), contribuicao.id)).rejects.toThrow();
  });

  it("RN15: o RLS recusa quem tenta dar estrela em nome de outra pessoa", async () => {
    const { lia, jo, contribuicao } = await cenario();

    /*
     * Segunda barreira (regra de segurança 2). O Prisma conecta como dono
     * e passa por cima do RLS, então esta é a única forma de exercitá-lo:
     * uma conexão com `SET ROLE authenticated` e o `hub.viewer_id` da Lia,
     * tentando gravar a linha da Jo.
     */
    await asViewer(lia.id, async (client) => {
      await expect(
        client.query("INSERT INTO answer_stars (answer_id, profile_id) VALUES ($1, $2)", [
          contribuicao.id,
          jo.id,
        ]),
      ).rejects.toThrow();
    });

    expect(await db.answerStar.count()).toBe(0);
  });

  it("RN15: passar do limite por minuto é recusado", async () => {
    const { lia, topico, contribuicao } = await cenario();

    /*
     * O limite lê `answer_stars.created_at` desta pessoa, em qualquer
     * contribuição — então encher é o que o põe no teto.
     *
     * Em duas instruções SQL, e não em sessenta idas ao Prisma: a versão
     * com laço levava quase um minuto e deixava o `TRUNCATE` do próximo
     * teste esperando. O que este teste mede é a regra, não a velocidade
     * do cliente.
     */
    await db.$executeRawUnsafe(
      `INSERT INTO answers (id, topic_id, author_id, text, created_at)
       SELECT gen_random_uuid(), $1::uuid, $2::uuid, 'enchendo ' || i, now()
         FROM generate_series(1, $3::int) AS i`,
      topico.id,
      lia.id,
      ESTRELAS_POR_MINUTO,
    );
    await db.$executeRawUnsafe(
      `INSERT INTO answer_stars (answer_id, profile_id, created_at)
       SELECT id, $1::uuid, now() FROM answers WHERE text LIKE 'enchendo %'`,
      lia.id,
    );

    await expect(alternarEstrela(viewerFor(lia.id), contribuicao.id)).rejects.toThrow(
      /Muitas estrelas/,
    );
  });
});

describe("RN15: apagar e ordenar", () => {
  it("RN15: apagar a contribuição apaga as estrelas dela", async () => {
    const { lia, jo, contribuicao } = await cenario();
    await alternarEstrela(viewerFor(lia.id), contribuicao.id);
    expect(await db.answerStar.count({ where: { answerId: contribuicao.id } })).toBe(1);

    await deleteAnswer(viewerFor(jo.id), contribuicao.id);

    // O `ON DELETE CASCADE` não dispara: apagar no Hub é lógico.
    expect(await db.answerStar.count({ where: { answerId: contribuicao.id } })).toBe(0);
  });

  it("RN15: a ordem padrão é por estrelas, e o empate cai na mais recente", async () => {
    const { lia, jo, topico, comunidade } = await cenario();
    const rui = await makeProfile({ name: "Rui Prates", handle: "rui" });
    await joinCommunity(viewerFor(rui.id), comunidade.id);

    const antiga = await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "a antiga, empatada",
      media: null,
    });
    const recente = await createAnswer(viewerFor(rui.id), {
      topicId: topico.id,
      text: "a recente, empatada",
      media: null,
    });
    const campea = await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "a campeã",
      media: null,
    });

    // Duas estrelas na campeã, uma em cada empatada.
    await alternarEstrela(viewerFor(lia.id), campea.id);
    await alternarEstrela(viewerFor(jo.id), campea.id);
    await alternarEstrela(viewerFor(lia.id), antiga.id);
    await alternarEstrela(viewerFor(lia.id), recente.id);

    const lista = (await respostasDoTopico(viewerFor(lia.id), topico.id))?.respostas ?? [];
    const textos = lista.map((r) => r.text);

    expect(textos[0]).toBe("a campeã");
    // Empate em 1: a mais recente fica acima.
    expect(textos[1]).toBe("a recente, empatada");
    expect(textos[2]).toBe("a antiga, empatada");
  });

  it("RN15: o relógio ignora as estrelas", async () => {
    const { lia, jo, topico } = await cenario();

    const segunda = await createAnswer(viewerFor(jo.id), {
      topicId: topico.id,
      text: "a segunda, sem estrela",
      media: null,
    });
    void segunda;

    // A primeira do cenário ganha estrela, e mesmo assim desce no relógio.
    const emOrdem =
      (await respostasDoTopico(viewerFor(lia.id), topico.id, "antigas"))?.respostas ?? [];
    await alternarEstrela(viewerFor(lia.id), emOrdem[0]!.id);

    const novas = (await respostasDoTopico(viewerFor(lia.id), topico.id, "novas"))?.respostas ?? [];
    expect(novas[0]!.text).toBe("a segunda, sem estrela");

    const antigas =
      (await respostasDoTopico(viewerFor(lia.id), topico.id, "antigas"))?.respostas ?? [];
    expect(antigas[0]!.text).toBe("Foi num galpão em Curitiba.");
  });
});
