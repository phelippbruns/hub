/**
 * Notificações (F15): quem é avisado, e quem não é.
 *
 * A regra que organiza tudo aqui é a RN34 — cada tipo tem um interruptor, e
 * ele é respeitado **na hora de criar**. Guardar aviso que a pessoa desligou
 * e filtrar na leitura seria guardar o que ninguém pediu, e bastaria uma
 * consulta esquecer o filtro para ele aparecer.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, joinAs, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  avisar,
  avisarMarcados,
  listarNotificacoes,
  marcarNotificacoesComoLidas,
} from "./notificacoes";
import { createAnswer, createTopic } from "./topics";
import { acceptInvite, inviteToCabin, sendMessage } from "./cabins";
import { followTopic } from "./follows";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

async function cenario() {
  const lia = await makeProfile({ name: "Lia Souza", handle: "lia" });
  const jo = await makeProfile({ name: "Jo Ramos", handle: "jo" });
  const rafa = await makeProfile({ name: "Rafa Lima", handle: "rafa" });
  const dani = await makeProfile({ name: "Dani Alves", handle: "dani" });

  const universo = await makeUniverse();
  const comunidade = await makeCommunity(universo.id, lia.id);
  await joinAs(comunidade.id, jo.id);
  await joinAs(comunidade.id, rafa.id);

  const criado = await createTopic(viewerFor(lia.id), {
    communityId: comunidade.id,
    name: "primeira festa",
    description: "Como foi?",
    media: null,
  });
  const topico = await db.topic.findUniqueOrThrow({ where: { id: criado!.id } });

  return { lia, jo, rafa, dani, comunidade, topico };
}

const avisosDe = (profileId: string, kind?: string) =>
  db.notification.findMany({ where: { profileId, ...(kind ? { kind: kind as never } : {}) } });

describe("RN34: o interruptor manda na hora de criar", () => {
  it("desligado não grava nada", async () => {
    const { jo } = await cenario();
    await db.profile.update({ where: { id: jo.id }, data: { notifyCabin: false } });

    const criou = await avisar(jo.id, "cabin_invite", { cabinId: "x" });

    expect(criou).toBe(false);
    expect(await avisosDe(jo.id)).toHaveLength(0);
  });

  it("ninguém é avisado do que fez", async () => {
    const { lia } = await cenario();

    const criou = await avisar(lia.id, "mention", { topicId: "x" }, lia.id);

    expect(criou).toBe(false);
  });

  it("RN33: remoção pela moderação avisa mesmo com tudo desligado", async () => {
    const { jo } = await cenario();
    await db.profile.update({
      where: { id: jo.id },
      data: {
        notifyCabin: false,
        notifyMention: false,
        notifyTopicBecameHot: false,
        notifyFollowedTopics: false,
        notifyNewTopicInCommunity: false,
      },
    });

    // É obrigação, não opção: quem teve conteúdo removido precisa saber.
    expect(await avisar(jo.id, "content_removed", { motivo: "spam" })).toBe(true);
  });
});

describe("convite e mensagem de Cabine", () => {
  it("o convite avisa quem foi convidado, e só ele", async () => {
    const { lia, jo } = await cenario();

    await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });

    expect(await avisosDe(jo.id, "cabin_invite")).toHaveLength(1);
    expect(await avisosDe(lia.id, "cabin_invite")).toHaveLength(0);
  });

  it("a mensagem avisa quem está na Cabine, menos quem escreveu", async () => {
    const { lia, jo } = await cenario();
    const convite = await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });
    await acceptInvite(viewerFor(jo.id), convite!.id);

    await sendMessage(viewerFor(lia.id), { cabinId: convite!.cabinId, text: "oi" });

    expect(await avisosDe(jo.id, "cabin_message")).toHaveLength(1);
    expect(await avisosDe(lia.id, "cabin_message")).toHaveLength(0);
  });

  it("com a Cabine desligada, nada chega", async () => {
    const { lia, jo } = await cenario();
    await db.profile.update({ where: { id: jo.id }, data: { notifyCabin: false } });

    await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });

    // O convite existe — só o aviso não. Desligar não impede de ser
    // convidado, impede de ser incomodado.
    expect(await avisosDe(jo.id)).toHaveLength(0);
    expect(await db.cabinInvite.count({ where: { inviteeId: jo.id } })).toBe(1);
  });
});

describe("RN34: novo tópico é o único desligado por padrão", () => {
  it("por padrão, ninguém é avisado de tópico novo", async () => {
    const { lia, jo, comunidade } = await cenario();
    void lia;

    // O tópico do cenário já foi criado; ninguém recebeu nada.
    expect(await avisosDe(jo.id, "new_topic_in_community")).toHaveLength(0);
    void comunidade;
  });

  it("quem liga passa a receber", async () => {
    const { jo, rafa, comunidade } = await cenario();
    await db.profile.update({
      where: { id: jo.id },
      data: { notifyNewTopicInCommunity: true },
    });

    // O Rafa, e não a Lia: a RN07 dá um tópico por pessoa por dia em cada
    // comunidade, e a Lia já gastou o dela no cenário.
    await createTopic(viewerFor(rafa.id), {
      communityId: comunidade.id,
      name: "segundo assunto",
      description: "Mais uma pergunta.",
      media: null,
    });

    expect(await avisosDe(jo.id, "new_topic_in_community")).toHaveLength(1);
  });
});

describe("marcar com @", () => {
  it("avisa quem foi marcado, uma vez", async () => {
    const { lia, jo, topico } = await cenario();

    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "@jo você estava lá?",
      media: null,
    });

    expect(await avisosDe(jo.id, "mention")).toHaveLength(1);
  });

  it("marcar duas vezes a mesma pessoa é um aviso só", async () => {
    const { lia, jo, topico } = await cenario();

    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "@jo, olha isso @jo",
      media: null,
    });

    expect(await avisosDe(jo.id, "mention")).toHaveLength(1);
  });

  it("marcar quem não é da comunidade não avisa ninguém", async () => {
    const { lia, dani, topico } = await cenario();

    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "@dani vem ver",
      media: null,
    });

    // Item 7: marcar é convite, não intromissão. Quem está de fora nem fica
    // sabendo que foi citado.
    expect(await avisosDe(dani.id)).toHaveLength(0);
  });

  it("RN26: bloqueio vale nos dois sentidos", async () => {
    const { lia, jo, rafa, topico, comunidade } = await cenario();
    void comunidade;

    await db.block.create({ data: { blockerId: jo.id, blockedId: lia.id } });
    await db.block.create({ data: { blockerId: lia.id, blockedId: rafa.id } });

    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "@jo e @rafa",
      media: null,
    });

    expect(await avisosDe(jo.id, "mention"), "quem me bloqueou").toHaveLength(0);
    expect(await avisosDe(rafa.id, "mention"), "quem eu bloqueei").toHaveLength(0);
  });

  it("quem desligou não recebe", async () => {
    const { lia, jo, topico } = await cenario();
    await db.profile.update({ where: { id: jo.id }, data: { notifyMention: false } });

    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "@jo olha",
      media: null,
    });

    expect(await avisosDe(jo.id, "mention")).toHaveLength(0);
  });

  it("marcar na abertura do tópico também avisa", async () => {
    const { jo, rafa, comunidade } = await cenario();

    // O Rafa abre: a Lia já usou o tópico do dia dela (RN07).
    await createTopic(viewerFor(rafa.id), {
      communityId: comunidade.id,
      name: "com marcação",
      description: "@jo lembra disso?",
      media: null,
    });

    expect(await avisosDe(jo.id, "mention")).toHaveLength(1);
  });

  it("@ de quem não existe não quebra nada", async () => {
    const { lia, topico } = await cenario();

    const resposta = await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "@ninguem existe aqui",
      media: null,
    });

    expect(resposta.id).toBeTruthy();
  });

  it("devolve quem foi avisado, para quem chamar poder conferir", async () => {
    const { lia, jo, comunidade, topico } = await cenario();

    const avisados = await avisarMarcados({
      texto: "@jo e @ninguem",
      autorId: lia.id,
      communityId: comunidade.id,
      topicId: topico.id,
    });

    expect(avisados).toEqual([jo.id]);
  });
});

describe("o aviso diário dos tópicos seguidos", () => {
  /** Respostas de ontem no tópico, direto no banco: nenhuma tela escolhe quando. */
  async function respostasDeOntem(topicId: string, autores: string[]) {
    for (const autorId of autores) {
      await db.$executeRaw`
        INSERT INTO answers (id, topic_id, author_id, text, created_at)
        VALUES (gen_random_uuid(), ${topicId}::uuid, ${autorId}::uuid, 'de ontem',
                ((hub_cycle_date(now()) - 1) + time '12:00') AT TIME ZONE hub_cycle_timezone())
      `;
    }
  }

  it("agrupa tudo num aviso só, com as contas certas", async () => {
    const { lia, jo, rafa, topico } = await cenario();
    await followTopic(viewerFor(lia.id), topico.id);

    await respostasDeOntem(topico.id, [jo.id, rafa.id, jo.id]);
    await db.$executeRaw`SELECT hub_avisar_topicos_seguidos(hub_cycle_date(now()) - 1)`;

    const avisos = await avisosDe(lia.id, "followed_topics_digest");
    expect(avisos).toHaveLength(1);

    const dados = avisos[0]?.payload as { respostas: number; topicos: number };
    expect(dados.respostas).toBe(3);
    expect(dados.topicos).toBe(1);
  });

  it("rodar de novo no mesmo dia não duplica", async () => {
    const { lia, jo, topico } = await cenario();
    await followTopic(viewerFor(lia.id), topico.id);
    await respostasDeOntem(topico.id, [jo.id]);

    await db.$executeRaw`SELECT hub_avisar_topicos_seguidos(hub_cycle_date(now()) - 1)`;
    await db.$executeRaw`SELECT hub_avisar_topicos_seguidos(hub_cycle_date(now()) - 1)`;

    expect(await avisosDe(lia.id, "followed_topics_digest")).toHaveLength(1);
  });

  it("a própria resposta não vira novidade", async () => {
    const { lia, topico } = await cenario();
    await followTopic(viewerFor(lia.id), topico.id);
    await respostasDeOntem(topico.id, [lia.id]);

    await db.$executeRaw`SELECT hub_avisar_topicos_seguidos(hub_cycle_date(now()) - 1)`;

    expect(await avisosDe(lia.id, "followed_topics_digest")).toHaveLength(0);
  });

  it("quem desligou não recebe", async () => {
    const { lia, jo, topico } = await cenario();
    await db.profile.update({ where: { id: lia.id }, data: { notifyFollowedTopics: false } });
    await followTopic(viewerFor(lia.id), topico.id);
    await respostasDeOntem(topico.id, [jo.id]);

    await db.$executeRaw`SELECT hub_avisar_topicos_seguidos(hub_cycle_date(now()) - 1)`;

    expect(await avisosDe(lia.id, "followed_topics_digest")).toHaveLength(0);
  });

  it("quem não segue nada não recebe", async () => {
    const { lia, jo, topico } = await cenario();
    await respostasDeOntem(topico.id, [jo.id]);

    await db.$executeRaw`SELECT hub_avisar_topicos_seguidos(hub_cycle_date(now()) - 1)`;

    expect(await avisosDe(lia.id, "followed_topics_digest")).toHaveLength(0);
  });
});

describe("a central", () => {
  it("resolve os ids em nomes, e diz para onde ir", async () => {
    const { lia, jo, topico } = await cenario();

    await createAnswer(viewerFor(lia.id), {
      topicId: topico.id,
      text: "@jo olha isso",
      media: null,
    });

    const [aviso] = await listarNotificacoes(viewerFor(jo.id));

    expect(aviso?.tipo).toBe("mention");
    expect(aviso?.texto).toContain("Lia Souza");
    expect(aviso?.texto).toContain("primeira festa");
    expect(aviso?.href).toContain("/primeira-festa");
    // Marcação é pessoal: vai para o topo, destacada (tela 8).
    expect(aviso?.pessoal).toBe(true);
  });

  it("o Hot Topic não é pessoal: ninguém está esperando resposta", async () => {
    const { lia, topico, comunidade } = await cenario();
    await avisar(lia.id, "topic_became_hot", {
      topicId: topico.id,
      communityId: comunidade.id,
    });

    const [aviso] = await listarNotificacoes(viewerFor(lia.id));
    expect(aviso?.pessoal).toBe(false);
  });

  it("abrir marca tudo como lido", async () => {
    const { lia, topico, comunidade } = await cenario();
    await avisar(lia.id, "topic_became_hot", {
      topicId: topico.id,
      communityId: comunidade.id,
    });

    await marcarNotificacoesComoLidas(viewerFor(lia.id));

    const [aviso] = await listarNotificacoes(viewerFor(lia.id));
    expect(aviso?.lida).toBe(true);
  });

  it("ninguém lê a notificação de outra pessoa", async () => {
    const { lia, jo, topico, comunidade } = await cenario();
    await avisar(lia.id, "topic_became_hot", {
      topicId: topico.id,
      communityId: comunidade.id,
    });

    expect(await listarNotificacoes(viewerFor(jo.id))).toHaveLength(0);
  });
});
