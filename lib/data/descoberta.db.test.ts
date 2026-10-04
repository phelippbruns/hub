/**
 * Descoberta (F06): RN05 e busca sem acento.
 *
 * Os dois critérios de aceite da feature moram aqui.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  buscarComunidades,
  buscarPessoas,
  buscarTopicos,
  comunidadesDoUniverso,
  paraVoce,
  universosComContagem,
} from "./descoberta";
import { joinCommunity, listExploreCommunities } from "./communities";
import { createTopic, createAnswer } from "./topics";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

/** Cria uma comunidade já com a quantidade de membros pedida. */
async function comunidadeCom(
  universeId: string,
  nome: string,
  membros: number,
): Promise<{ id: string }> {
  const comunidade = await db.community.create({
    data: { universeId, name: nome, nameNormalized: nome, intro: "intro" },
  });

  for (let i = 0; i < membros; i += 1) {
    const pessoa = await makeProfile();
    await db.membership.create({ data: { communityId: comunidade.id, profileId: pessoa.id } });
  }

  return comunidade;
}

describe("RN05: o corte de 20 membros", () => {
  it("com 19 membros não aparece em Explorar, mas aparece na busca", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    await comunidadeCom(universo.id, "Quase Lá", 19);

    const explorar = await paraVoce(viewerFor(eu.id));
    expect(explorar.map((c) => c.name)).not.toContain("Quase Lá");

    // O corte evita entulhar a descoberta; não serve para esconder.
    const busca = await buscarComunidades(viewerFor(eu.id), "Quase");
    expect(busca.map((c) => c.name)).toContain("Quase Lá");
  });

  it("com 20 membros aparece em Explorar", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    await comunidadeCom(universo.id, "Chegou", 20);

    const explorar = await paraVoce(viewerFor(eu.id));
    expect(explorar.map((c) => c.name)).toContain("Chegou");
  });

  it("o vigésimo membro faz a comunidade aparecer", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await comunidadeCom(universo.id, "Na Fronteira", 19);

    expect((await paraVoce(viewerFor(eu.id))).map((c) => c.name)).not.toContain("Na Fronteira");

    const vigesimo = await makeProfile();
    await joinCommunity(viewerFor(vigesimo.id), comunidade.id);

    expect((await paraVoce(viewerFor(eu.id))).map((c) => c.name)).toContain("Na Fronteira");
  });

  it("entrar pelo # muda a contagem de membros", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await comunidadeCom(universo.id, "Entrar Aqui", 20);

    await joinCommunity(viewerFor(eu.id), comunidade.id);

    const depois = await db.community.findUniqueOrThrow({ where: { id: comunidade.id } });
    expect(depois.membersCount).toBe(21);
  });

  it("o corte vale também na página do Universo", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    await comunidadeCom(universo.id, "Pequena Demais", 19);
    await comunidadeCom(universo.id, "Grande o Bastante", 20);

    const { comunidades } = await comunidadesDoUniverso(viewerFor(eu.id), universo.slug);
    const nomes = comunidades.map((c) => c.name);

    expect(nomes).toContain("Grande o Bastante");
    expect(nomes).not.toContain("Pequena Demais");
  });

  it("listExploreCommunities aplica o mesmo corte", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    await comunidadeCom(universo.id, "Dezenove", 19);
    await comunidadeCom(universo.id, "Vinte", 20);

    const lista = await listExploreCommunities(viewerFor(eu.id));
    expect(lista.map((c) => c.name)).toEqual(["Vinte"]);
  });
});

describe("busca sem diferenciar acento", () => {
  it.each([
    ["musica", "Música Eletrônica"],
    ["MUSICA", "Música Eletrônica"],
    ["eletronica", "Música Eletrônica"],
    ["analogica", "Analógica"],
    ["retro", "Retrô"],
  ])("procurar %s acha %s", async (termo, esperado) => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Universo");
    await db.community.createMany({
      data: ["Música Eletrônica", "Analógica", "Retrô"].map((name) => ({
        universeId: universo.id,
        name,
        nameNormalized: name,
        intro: "intro",
      })),
    });

    const achadas = await buscarComunidades(viewerFor(eu.id), termo);
    expect(achadas.map((c) => c.name)).toContain(esperado);
  });

  it("busca vazia não devolve tudo", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Universo");
    await comunidadeCom(universo.id, "Alguma", 20);

    expect(await buscarComunidades(viewerFor(eu.id), "   ")).toEqual([]);
  });

  it("acha tópico por nome, ignorando acento", async () => {
    const lia = await makeProfile();
    const universo = await makeUniverse("Universo");
    const comunidade = await db.community.create({
      data: { universeId: universo.id, name: "Comunidade", nameNormalized: "x", intro: "i" },
    });
    await db.membership.create({ data: { communityId: comunidade.id, profileId: lia.id } });
    await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "música de pista",
      description: "Qual te marcou?",
      media: null,
    });

    const achados = await buscarTopicos(viewerFor(lia.id), "musica");
    expect(achados.map((t) => t.name)).toContain("música de pista");
  });

  it("acha pessoa por nome e por @", async () => {
    const eu = await makeProfile({ handle: "eu" });
    await makeProfile({ handle: "liasouza", name: "Lia Souza" });

    expect((await buscarPessoas(viewerFor(eu.id), "lia")).map((p) => p.handle)).toContain(
      "liasouza",
    );
    expect((await buscarPessoas(viewerFor(eu.id), "Souza")).map((p) => p.handle)).toContain(
      "liasouza",
    );
  });

  it("não aparece a si mesmo na busca de pessoas", async () => {
    const eu = await makeProfile({ handle: "euzinho", name: "Eu Mesmo" });
    expect(await buscarPessoas(viewerFor(eu.id), "Eu Mesmo")).toEqual([]);
  });

  it("RN26: quem está bloqueado não aparece", async () => {
    const eu = await makeProfile({ handle: "eu" });
    const outra = await makeProfile({ handle: "outra", name: "Outra Pessoa" });

    expect(await buscarPessoas(viewerFor(eu.id), "Outra")).toHaveLength(1);

    await db.block.create({ data: { blockerId: eu.id, blockedId: outra.id } });
    expect(await buscarPessoas(viewerFor(eu.id), "Outra")).toEqual([]);
  });
});

describe("o que cada tela mostra", () => {
  it("a pessoa vê comunidades em comum e se já segue", async () => {
    const eu = await makeProfile({ handle: "eu" });
    const lia = await makeProfile({ handle: "lia", name: "Lia Souza" });
    const universo = await makeUniverse("Universo");
    const comunidade = await comunidadeCom(universo.id, "Juntas", 20);

    await joinCommunity(viewerFor(eu.id), comunidade.id);
    await joinCommunity(viewerFor(lia.id), comunidade.id);

    const [achada] = await buscarPessoas(viewerFor(eu.id), "Lia");
    expect(achada?.comunidadesEmComum).toBe(1);
    expect(achada?.seguindo).toBe(false);
  });

  it("a página do Universo conta as respostas de hoje", async () => {
    const lia = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await comunidadeCom(universo.id, "Com Respostas", 20);
    await joinCommunity(viewerFor(lia.id), comunidade.id);

    const topico = await createTopic(viewerFor(lia.id), {
      communityId: comunidade.id,
      name: "tópico",
      description: "abertura",
      media: null,
    });
    await createAnswer(viewerFor(lia.id), {
      topicId: topico!.id,
      text: "uma resposta de hoje",
      media: null,
    });

    const { comunidades } = await comunidadesDoUniverso(viewerFor(lia.id), universo.slug);
    expect(comunidades.find((c) => c.name === "Com Respostas")?.respostasHoje).toBe(1);
  });

  it("o Universo só mostra as suas comunidades", async () => {
    const eu = await makeProfile();
    const musica = await makeUniverse("Música");
    const cinema = await makeUniverse("Cinema");
    await comunidadeCom(musica.id, "De Música", 20);
    await comunidadeCom(cinema.id, "De Cinema", 20);

    const { comunidades } = await comunidadesDoUniverso(viewerFor(eu.id), musica.slug);
    expect(comunidades.map((c) => c.name)).toEqual(["De Música"]);
  });

  it("a busca dentro do Universo filtra sem acento", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    await comunidadeCom(universo.id, "Música Eletrônica", 20);
    await comunidadeCom(universo.id, "Vinil", 20);

    const { comunidades } = await comunidadesDoUniverso(viewerFor(eu.id), universo.slug, {
      termo: "eletronica",
    });
    expect(comunidades.map((c) => c.name)).toEqual(["Música Eletrônica"]);
  });

  it("Explorar não sugere comunidade em que já estou", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Música");
    const comunidade = await comunidadeCom(universo.id, "Já Estou", 20);
    await joinCommunity(viewerFor(eu.id), comunidade.id);

    expect((await paraVoce(viewerFor(eu.id))).map((c) => c.name)).not.toContain("Já Estou");
  });

  it("a grade de Universos traz a contagem de comunidades", async () => {
    const universo = await makeUniverse("Música");
    await comunidadeCom(universo.id, "Uma", 20);
    await comunidadeCom(universo.id, "Outra", 5);

    const universos = await universosComContagem();
    const achado = universos.find((u) => u.id === universo.id);

    // A contagem é de tudo que existe; o corte do RN05 vale na listagem.
    expect(achado?._count.communities).toBe(2);
  });
});
