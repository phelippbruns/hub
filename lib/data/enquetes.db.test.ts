/**
 * Enquetes (RN37).
 *
 * O critério de aceite desta feature é um: **a contagem não sai do
 * servidor para quem ainda não votou numa enquete aberta.** Os testes
 * olham o que a função devolve, e não a tela — esconder na tela deixaria o
 * número viajando no HTML, e aí a enquete mediria quem chegou primeiro.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, joinAs, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  criarEnquete,
  enquetesDaComunidade,
  enquetesEsperandoMeuVoto,
  tirarVoto,
  votar,
} from "./enquetes";
import { criarEnqueteSchema } from "./validation";
import { anonymous, viewerFor } from "./viewer";

beforeEach(resetDatabase);

async function cenario() {
  const lia = await makeProfile({ handle: "lia", name: "Lia Souza" });
  const jo = await makeProfile({ handle: "jo", name: "Jo Ramos" });
  const rafa = await makeProfile({ handle: "rafa", name: "Rafa Lima" });
  const dani = await makeProfile({ handle: "dani", name: "Dani Rocha" });
  const universo = await makeUniverse("Hubverso de teste");
  const comunidade = await makeCommunity(universo.id, lia.id, "Animação");
  await joinAs(comunidade.id, jo.id);
  await joinAs(comunidade.id, rafa.id);

  const enquete = await criarEnquete(viewerFor(lia.id), {
    communityId: comunidade.id,
    pergunta: "Qual técnica no próximo desafio?",
    opcoes: ["Stop motion", "Pixel art", "Rotoscopia"],
    dias: 3,
  });

  // `dani` é de fora da comunidade.
  return { lia, jo, rafa, dani, comunidade, enquete };
}

describe("RN37: o resultado só aparece depois do voto", () => {
  it("quem não votou recebe contagens nulas, não zeradas nem escondidas", async () => {
    const { jo, comunidade } = await cenario();

    const [enquete] = await enquetesDaComunidade(viewerFor(jo.id), comunidade.id);

    expect(enquete?.resultadoAberto).toBe(false);
    expect(enquete?.totalDeVotos).toBeNull();
    expect(enquete?.opcoes.map((o) => o.votos)).toEqual([null, null, null]);
    // A pergunta e as opções aparecem: é com elas que a pessoa decide.
    expect(enquete?.opcoes.map((o) => o.texto)).toEqual(["Stop motion", "Pixel art", "Rotoscopia"]);
  });

  it("depois de votar, o resultado inteiro aparece", async () => {
    const { lia, jo, rafa, comunidade, enquete } = await cenario();
    await votar(viewerFor(lia.id), enquete.id, 0);
    await votar(viewerFor(rafa.id), enquete.id, 0);
    await votar(viewerFor(jo.id), enquete.id, 1);

    const [naTela] = await enquetesDaComunidade(viewerFor(jo.id), comunidade.id);

    expect(naTela?.resultadoAberto).toBe(true);
    expect(naTela?.meuVoto).toBe(1);
    expect(naTela?.totalDeVotos).toBe(3);
    expect(naTela?.opcoes.map((o) => o.votos)).toEqual([2, 1, 0]);
  });

  it("encerrada, o resultado é de todo mundo — inclusive de quem não votou", async () => {
    const { lia, jo, comunidade, enquete } = await cenario();
    await votar(viewerFor(lia.id), enquete.id, 2);
    await db.poll.update({
      where: { id: enquete.id },
      data: { closesAt: new Date(Date.now() - 60_000) },
    });

    const [naTela] = await enquetesDaComunidade(viewerFor(jo.id), comunidade.id);

    expect(naTela?.encerrada).toBe(true);
    expect(naTela?.resultadoAberto).toBe(true);
    expect(naTela?.meuVoto).toBeNull();
    expect(naTela?.opcoes.map((o) => o.votos)).toEqual([0, 0, 1]);
  });

  it("visitante sem sessão vê a pergunta e nunca o resultado de uma aberta", async () => {
    const { lia, comunidade, enquete } = await cenario();
    await votar(viewerFor(lia.id), enquete.id, 0);

    const [naTela] = await enquetesDaComunidade(anonymous, comunidade.id);

    expect(naTela?.pergunta).toBe("Qual técnica no próximo desafio?");
    expect(naTela?.resultadoAberto).toBe(false);
    expect(naTela?.totalDeVotos).toBeNull();
  });
});

describe("o voto", () => {
  it("é um por pessoa, e trocar substitui em vez de somar", async () => {
    const { jo, comunidade, enquete } = await cenario();
    await votar(viewerFor(jo.id), enquete.id, 0);
    await votar(viewerFor(jo.id), enquete.id, 2);

    const linhas = await db.pollVote.findMany({ where: { pollId: enquete.id } });
    expect(linhas).toHaveLength(1);
    expect(linhas[0]?.position).toBe(2);

    const [naTela] = await enquetesDaComunidade(viewerFor(jo.id), comunidade.id);
    expect(naTela?.totalDeVotos).toBe(1);
  });

  it("o banco recusa duas linhas da mesma pessoa, mesmo num INSERT cru", async () => {
    const { jo, enquete } = await cenario();
    await votar(viewerFor(jo.id), enquete.id, 0);

    await expect(
      db.pollVote.create({ data: { pollId: enquete.id, profileId: jo.id, position: 1 } }),
    ).rejects.toThrow();
  });

  it("o banco recusa voto numa posição que a enquete não tem", async () => {
    const { jo, enquete } = await cenario();

    // A enquete tem 3 opções: 0, 1 e 2. A posição 3 não existe nela.
    await expect(
      db.pollVote.create({ data: { pollId: enquete.id, profileId: jo.id, position: 3 } }),
    ).rejects.toThrow();
  });

  it("quem não é da comunidade não vota", async () => {
    const { dani, enquete } = await cenario();
    await expect(votar(viewerFor(dani.id), enquete.id, 0)).rejects.toThrow();
  });

  it("enquete encerrada não aceita voto nem troca", async () => {
    const { jo, enquete } = await cenario();
    await votar(viewerFor(jo.id), enquete.id, 0);
    await db.poll.update({
      where: { id: enquete.id },
      data: { closesAt: new Date(Date.now() - 60_000) },
    });

    await expect(votar(viewerFor(jo.id), enquete.id, 1)).rejects.toThrow();
    await expect(tirarVoto(viewerFor(jo.id), enquete.id)).rejects.toThrow();
  });

  it("tirar o voto devolve a enquete ao estado de antes, com o resultado fechado", async () => {
    const { jo, comunidade, enquete } = await cenario();
    await votar(viewerFor(jo.id), enquete.id, 0);
    await tirarVoto(viewerFor(jo.id), enquete.id);

    const [naTela] = await enquetesDaComunidade(viewerFor(jo.id), comunidade.id);
    expect(naTela?.meuVoto).toBeNull();
    expect(naTela?.resultadoAberto).toBe(false);
  });
});

describe("criar a enquete", () => {
  it("qualquer membro cria, e quem está de fora não", async () => {
    const { jo, dani, comunidade } = await cenario();

    await expect(
      criarEnquete(viewerFor(jo.id), {
        communityId: comunidade.id,
        pergunta: "Melhor horário para o encontro?",
        opcoes: ["Sábado, 10h", "Domingo, 20h"],
        dias: 7,
      }),
    ).resolves.toBeTruthy();

    await expect(
      criarEnquete(viewerFor(dani.id), {
        communityId: comunidade.id,
        pergunta: "Posso?",
        opcoes: ["Sim", "Não"],
        dias: 1,
      }),
    ).rejects.toThrow();
  });

  it("a enquete nasce com as opções na ordem em que foram escritas", async () => {
    const { lia, comunidade } = await cenario();
    const nova = await criarEnquete(viewerFor(lia.id), {
      communityId: comunidade.id,
      pergunta: "Nome do desafio semanal?",
      opcoes: ["Quadro a Quadro", "12 Quadros", "Bola Quica"],
      dias: 1,
    });

    const opcoes = await db.pollOption.findMany({
      where: { pollId: nova.id },
      orderBy: { position: "asc" },
    });
    expect(opcoes.map((o) => o.text)).toEqual(["Quadro a Quadro", "12 Quadros", "Bola Quica"]);
  });

  it.each([
    [["Só uma"], "pelo menos 2"],
    [["a", "b", "c", "d", "e"], "no máximo 4"],
    [["Igual", "igual"], "repetidas"],
  ])("recusa %s", (opcoes, trecho) => {
    const resultado = criarEnqueteSchema.safeParse({
      communityId: "00000000-0000-4000-8000-000000000000",
      pergunta: "Vale?",
      opcoes,
      dias: 3,
    });
    expect(resultado.success).toBe(false);
    expect(JSON.stringify(resultado.error?.issues)).toContain(trecho);
  });

  it("RN16: pergunta com link é recusada", () => {
    const resultado = criarEnqueteSchema.safeParse({
      communityId: "00000000-0000-4000-8000-000000000000",
      pergunta: "Veja em exemplo.com e vote",
      opcoes: ["Sim", "Não"],
      dias: 3,
    });
    expect(resultado.success).toBe(false);
  });

  it("recusa duração fora de 1, 3 ou 7 dias", () => {
    const resultado = criarEnqueteSchema.safeParse({
      communityId: "00000000-0000-4000-8000-000000000000",
      pergunta: "Vale?",
      opcoes: ["Sim", "Não"],
      dias: 30,
    });
    expect(resultado.success).toBe(false);
  });
});

describe("o contador da aba", () => {
  it("conta as abertas que eu ainda não votei", async () => {
    const { lia, jo, comunidade, enquete } = await cenario();
    await criarEnquete(viewerFor(lia.id), {
      communityId: comunidade.id,
      pergunta: "Outra pergunta?",
      opcoes: ["Sim", "Não"],
      dias: 1,
    });

    expect(await enquetesEsperandoMeuVoto(viewerFor(jo.id), comunidade.id)).toBe(2);

    await votar(viewerFor(jo.id), enquete.id, 0);
    expect(await enquetesEsperandoMeuVoto(viewerFor(jo.id), comunidade.id)).toBe(1);
  });

  it("encerrada não conta, e visitante não tem contador", async () => {
    const { jo, comunidade, enquete } = await cenario();
    await db.poll.update({
      where: { id: enquete.id },
      data: { closesAt: new Date(Date.now() - 60_000) },
    });

    expect(await enquetesEsperandoMeuVoto(viewerFor(jo.id), comunidade.id)).toBe(0);
    expect(await enquetesEsperandoMeuVoto(anonymous, comunidade.id)).toBe(0);
  });
});
