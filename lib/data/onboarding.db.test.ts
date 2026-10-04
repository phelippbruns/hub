/**
 * RN31: o onboarding exige ao menos 3 comunidades, e quem vem de convite
 * volta ao tópico do link.
 *
 * O que se prova aqui é o que a tela não garante: a regra vale no servidor,
 * mesmo que alguém envie o formulário por fora dela.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  MINIMO_DE_COMUNIDADES,
  comunidadeDoConvite,
  comunidadesSeguidas,
  concluirOnboarding,
  jaFezOnboarding,
  listarUniversosComComunidades,
  registrarEscolhaDeNotificacoes,
} from "./onboarding";
import { createTopic } from "./topics";
import { viewerFor } from "./viewer";
import { RuleViolationError } from "./errors";

beforeEach(resetDatabase);

async function cenario(quantasComunidades = 5) {
  const pessoa = await makeProfile();
  const dono = await makeProfile();
  const universo = await makeUniverse();

  const comunidades = [];
  for (let i = 0; i < quantasComunidades; i += 1) {
    comunidades.push(await makeCommunity(universo.id, dono.id, `Comunidade ${i} ${Date.now()}`));
  }

  return { pessoa, dono, universo, comunidades };
}

describe("RN31: ao menos 3 comunidades", () => {
  it("conclui com exatamente 3", async () => {
    const { pessoa, comunidades } = await cenario();
    const ids = comunidades.slice(0, 3).map((c) => c.id);

    await expect(concluirOnboarding(viewerFor(pessoa.id), ids)).resolves.toEqual({
      comunidades: 3,
    });
    expect(await jaFezOnboarding(pessoa.id)).toBe(true);
  });

  it.each([0, 1, 2])("recusa com %s comunidades", async (quantas) => {
    const { pessoa, comunidades } = await cenario();
    const ids = comunidades.slice(0, quantas).map((c) => c.id);

    await expect(concluirOnboarding(viewerFor(pessoa.id), ids)).rejects.toThrow(RuleViolationError);
    expect(await jaFezOnboarding(pessoa.id)).toBe(false);
  });

  it("id repetido não conta como escolha a mais", async () => {
    const { pessoa, comunidades } = await cenario();
    const umaSo = comunidades[0]!.id;

    // Mandar a mesma comunidade três vezes passaria se a contagem fosse ingênua.
    await expect(concluirOnboarding(viewerFor(pessoa.id), [umaSo, umaSo, umaSo])).rejects.toThrow(
      RuleViolationError,
    );
  });

  it("id inventado não conta como escolha", async () => {
    const { pessoa, comunidades } = await cenario();
    const ids = [comunidades[0]!.id, comunidades[1]!.id, crypto.randomUUID()];

    await expect(concluirOnboarding(viewerFor(pessoa.id), ids)).rejects.toThrow(RuleViolationError);
  });

  it("entra e segue cada comunidade escolhida", async () => {
    const { pessoa, comunidades } = await cenario();
    const ids = comunidades.slice(0, 3).map((c) => c.id);
    await concluirOnboarding(viewerFor(pessoa.id), ids);

    const membros = await db.membership.count({ where: { profileId: pessoa.id } });
    expect(membros).toBe(3);

    // RN19: o Início é montado a partir das comunidades *seguidas*. Entrar sem
    // seguir deixaria a pessoa num Início vazio.
    const seguidas = await comunidadesSeguidas(viewerFor(pessoa.id));
    expect(seguidas.sort()).toEqual(ids.sort());
  });

  it("concluir duas vezes não duplica nada", async () => {
    const { pessoa, comunidades } = await cenario();
    const ids = comunidades.slice(0, 3).map((c) => c.id);

    await concluirOnboarding(viewerFor(pessoa.id), ids);
    await concluirOnboarding(viewerFor(pessoa.id), ids);

    expect(await db.membership.count({ where: { profileId: pessoa.id } })).toBe(3);
    expect(await db.follow.count({ where: { followerId: pessoa.id } })).toBe(3);
  });

  it("o mínimo é 3", () => {
    expect(MINIMO_DE_COMUNIDADES).toBe(3);
  });
});

describe("RN31: quem chega por convite", () => {
  it("a comunidade do convite vem junto com o tópico", async () => {
    const { dono, universo } = await cenario(0);
    const comunidade = await makeCommunity(universo.id, dono.id, "Música Eletrônica Teste");
    const topico = await createTopic(viewerFor(dono.id), {
      communityId: comunidade.id,
      name: "primeira festa",
      description: "Como foi a primeira festa?",
      media: null,
    });

    const convite = await comunidadeDoConvite(topico!.id);

    expect(convite?.topicName).toBe("primeira festa");
    expect(convite?.community.id).toBe(comunidade.id);
  });

  it("a comunidade do convite conta como uma das 3", async () => {
    const { pessoa, dono, universo, comunidades } = await cenario(2);
    const doConvite = await makeCommunity(universo.id, dono.id, "Do Convite");

    // Duas escolhidas na tela, mais a do convite: fecha as 3.
    await expect(
      concluirOnboarding(viewerFor(pessoa.id), [
        doConvite.id,
        comunidades[0]!.id,
        comunidades[1]!.id,
      ]),
    ).resolves.toEqual({ comunidades: 3 });

    const seguidas = await comunidadesSeguidas(viewerFor(pessoa.id));
    expect(seguidas).toContain(doConvite.id);
  });

  it("tópico apagado não vira convite", async () => {
    const { dono, universo } = await cenario(0);
    const comunidade = await makeCommunity(universo.id, dono.id, "Alguma Comunidade");
    const topico = await createTopic(viewerFor(dono.id), {
      communityId: comunidade.id,
      name: "sumiu",
      description: "Este tópico some",
      media: null,
    });
    await db.topic.update({ where: { id: topico!.id }, data: { deletedAt: new Date() } });

    expect(await comunidadeDoConvite(topico!.id)).toBeNull();
  });
});

describe("a tela de escolha", () => {
  it("lista as comunidades por Universo, sem o corte de 20 membros do RN05", async () => {
    const { dono, universo } = await cenario(0);
    await makeCommunity(universo.id, dono.id, "Comunidade Pequena");

    const universos = await listarUniversosComComunidades();
    const encontrado = universos.find((u) => u.id === universo.id);

    // Com o corte do Explorar aplicado aqui, uma comunidade de 1 membro não
    // apareceria e ninguém conseguiria escolher 3 num Hub recém-lançado.
    expect(encontrado?.communities.length).toBeGreaterThan(0);
    expect(encontrado?.communities[0]?.membersCount).toBeLessThan(20);
  });

  it("Universo sem comunidade não aparece", async () => {
    const vazio = await makeUniverse("Universo Vazio");
    const universos = await listarUniversosComComunidades();
    expect(universos.map((u) => u.id)).not.toContain(vazio.id);
  });
});

describe("RN34: notificações", () => {
  it("recusar desliga os avisos, mas não bloqueia o uso", async () => {
    const { pessoa, comunidades } = await cenario();
    await concluirOnboarding(
      viewerFor(pessoa.id),
      comunidades.slice(0, 3).map((c) => c.id),
    );

    await registrarEscolhaDeNotificacoes(viewerFor(pessoa.id), false);

    const depois = await db.profile.findUniqueOrThrow({ where: { id: pessoa.id } });
    expect(depois.notifyCabin).toBe(false);
    // O onboarding continua concluído: recusar não desfaz nada.
    expect(depois.onboardedAt).not.toBeNull();
  });

  it("aceitar mantém os padrões da RN34", async () => {
    const { pessoa } = await cenario(0);
    await registrarEscolhaDeNotificacoes(viewerFor(pessoa.id), true);

    const depois = await db.profile.findUniqueOrThrow({ where: { id: pessoa.id } });
    expect(depois.notifyTopicBecameHot).toBe(true);
    expect(depois.notifyCabin).toBe(true);
    // RN34: esta é a única desligada por padrão.
    expect(depois.notifyNewTopicInCommunity).toBe(false);
  });
});
