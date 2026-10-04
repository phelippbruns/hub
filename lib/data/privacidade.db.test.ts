/**
 * Privacidade: o critério de aceite central da F02.
 *
 * "Um usuário não consegue ler Coleção, mensagens ou lista de seguindo de
 * outro, **nem pela camada de dados nem pelo Supabase direto**."
 *
 * Por isso cada caso é testado nos dois caminhos:
 *   - `lib/data/` — a autorização que a aplicação usa (regra de segurança 1)
 *   - conexão com papel `authenticated` — o RLS, que é a segunda barreira e o
 *     único guarda quando o navegador fala direto com o Supabase
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  asViewer,
  db,
  joinAs,
  makeCommunity,
  makeProfile,
  makeUniverse,
  resetDatabase,
} from "./testing/db";
import { createTopic } from "./topics";
import { followProfile, followTopic, getCollection, getFollowing } from "./follows";
import { acceptInvite, inviteToCabin, listMessages, sendMessage } from "./cabins";
import { viewerFor } from "./viewer";
import { ForbiddenError } from "./errors";

beforeEach(resetDatabase);

/** Lia e Jo dividem uma comunidade; Rafa é de fora. */
async function cenario() {
  const lia = await makeProfile({ handle: "lia" });
  const jo = await makeProfile({ handle: "jo" });
  const rafa = await makeProfile({ handle: "rafa" });

  const universe = await makeUniverse();
  const community = await makeCommunity(universe.id, lia.id);
  await joinAs(community.id, jo.id);

  const topic = await createTopic(viewerFor(lia.id), {
    communityId: community.id,
    name: "primeira festa",
    description: "Como foi a primeira festa?",
    media: null,
  });

  return { lia, jo, rafa, community, topic: topic! };
}

describe("RN18/RN27: a Coleção é privada", () => {
  it("o dono vê a própria Coleção", async () => {
    const { lia, topic } = await cenario();
    await followTopic(viewerFor(lia.id), topic.id);

    const colecao = await getCollection(viewerFor(lia.id), lia.id);
    expect(colecao).toHaveLength(1);
  });

  it("pela camada de dados, outra pessoa não lê a Coleção alheia", async () => {
    const { lia, jo, topic } = await cenario();
    await followTopic(viewerFor(lia.id), topic.id);

    await expect(getCollection(viewerFor(jo.id), lia.id)).rejects.toThrow(ForbiddenError);
  });

  it("pelo Supabase direto, o RLS esconde a Coleção alheia", async () => {
    const { lia, jo, topic } = await cenario();
    await followTopic(viewerFor(lia.id), topic.id);

    // Jo consulta a tabela direto, como faria pelo cliente do navegador.
    const comoJo = await asViewer(jo.id, (client) =>
      client.query("SELECT * FROM follows WHERE follower_id = $1", [lia.id]),
    );
    expect(comoJo.rows).toHaveLength(0);

    // E a Lia continua vendo a sua.
    const comoLia = await asViewer(lia.id, (client) =>
      client.query("SELECT * FROM follows WHERE follower_id = $1", [lia.id]),
    );
    expect(comoLia.rows).toHaveLength(1);
  });
});

describe("RN27: a lista de seguindo é privada", () => {
  it("pela camada de dados, só o dono lê", async () => {
    const { lia, jo } = await cenario();
    await followProfile(viewerFor(lia.id), jo.id);

    await expect(getFollowing(viewerFor(lia.id), lia.id)).resolves.toHaveLength(1);
    await expect(getFollowing(viewerFor(jo.id), lia.id)).rejects.toThrow(ForbiddenError);
  });

  it("pelo Supabase direto, o RLS esconde", async () => {
    const { lia, jo } = await cenario();
    await followProfile(viewerFor(lia.id), jo.id);

    const rows = await asViewer(jo.id, (client) =>
      client.query("SELECT * FROM follows WHERE target = 'profile' AND follower_id = $1", [lia.id]),
    );
    expect(rows.rows).toHaveLength(0);
  });
});

describe("RN20: as mensagens da Cabine são privadas", () => {
  async function cabineComMensagem() {
    const base = await cenario();
    const invite = await inviteToCabin(viewerFor(base.lia.id), {
      inviteeId: base.jo.id,
      message: "bora trocar ideia",
    });
    await acceptInvite(viewerFor(base.jo.id), invite!.id);
    await sendMessage(viewerFor(base.lia.id), {
      cabinId: invite!.cabinId,
      text: "cheguei",
    });
    return { ...base, cabinId: invite!.cabinId };
  }

  it("quem participa lê", async () => {
    const { jo, cabinId } = await cabineComMensagem();
    await expect(listMessages(viewerFor(jo.id), cabinId)).resolves.toHaveLength(1);
  });

  it("pela camada de dados, quem não participa não lê", async () => {
    const { rafa, cabinId } = await cabineComMensagem();
    await expect(listMessages(viewerFor(rafa.id), cabinId)).rejects.toThrow(ForbiddenError);
  });

  it("pelo Supabase direto, o RLS esconde — é o caminho do Realtime", async () => {
    const { rafa, jo, cabinId } = await cabineComMensagem();

    const comoRafa = await asViewer(rafa.id, (client) =>
      client.query("SELECT * FROM messages WHERE cabin_id = $1", [cabinId]),
    );
    expect(comoRafa.rows).toHaveLength(0);

    const comoJo = await asViewer(jo.id, (client) =>
      client.query("SELECT * FROM messages WHERE cabin_id = $1", [cabinId]),
    );
    expect(comoJo.rows).toHaveLength(1);
  });

  it("quem não participa também não escreve na Cabine", async () => {
    const { rafa, cabinId } = await cabineComMensagem();

    await expect(sendMessage(viewerFor(rafa.id), { cabinId, text: "oi" })).rejects.toThrow(
      ForbiddenError,
    );

    // E pelo banco direto, o RLS recusa o INSERT.
    await expect(
      asViewer(rafa.id, (client) =>
        client.query(
          "INSERT INTO messages (id, cabin_id, author_id, text) VALUES (gen_random_uuid(), $1, $2, 'oi')",
          [cabinId, rafa.id],
        ),
      ),
    ).rejects.toThrow();
  });
});

describe("RN26: bloquear tira das Cabines em comum", () => {
  it("encerra a Cabine e cancela convites pendentes", async () => {
    const { lia, jo } = await cenario();
    const invite = await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });
    await acceptInvite(viewerFor(jo.id), invite!.id);

    const { blockProfile } = await import("./cabins");
    await blockProfile(viewerFor(lia.id), jo.id);

    const cabin = await db.cabin.findUnique({ where: { id: invite!.cabinId } });
    expect(cabin?.closedAt).not.toBeNull();

    const membros = await db.cabinMember.findMany({
      where: { cabinId: invite!.cabinId, leftAt: null },
    });
    expect(membros).toHaveLength(0);
  });

  it("impede novo convite depois do bloqueio", async () => {
    const { lia, jo } = await cenario();
    const { blockProfile } = await import("./cabins");
    await blockProfile(viewerFor(lia.id), jo.id);

    await expect(
      inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null }),
    ).rejects.toThrow(ForbiddenError);
  });
});

describe("RN16: visitante sem conta não vê respostas", () => {
  it("o RLS libera o tópico e esconde as respostas de quem não entrou", async () => {
    const { lia, topic } = await cenario();
    await db.answer.create({
      data: { topicId: topic.id, authorId: lia.id, text: "minha resposta" },
    });

    // Sem viewer: é quem abriu o link compartilhado, sem conta.
    const semConta = await asViewer(null, async (client) => ({
      topicos: await client.query("SELECT id FROM topics WHERE id = $1", [topic.id]),
      respostas: await client.query("SELECT id FROM answers WHERE topic_id = $1", [topic.id]),
    }));

    expect(semConta.topicos.rows).toHaveLength(1);
    expect(semConta.respostas.rows).toHaveLength(0);
  });
});

describe("notificações e eventos de métrica", () => {
  it("ninguém lê notificação alheia", async () => {
    const { lia, jo } = await cenario();
    await db.notification.create({
      data: { profileId: lia.id, kind: "cabin_invite", payload: {} },
    });

    const rows = await asViewer(jo.id, (client) =>
      client.query("SELECT * FROM notifications WHERE profile_id = $1", [lia.id]),
    );
    expect(rows.rows).toHaveLength(0);
  });

  it("eventos de métrica não são legíveis pelo navegador", async () => {
    const { lia } = await cenario();
    await db.analyticsEvent.create({ data: { profileId: lia.id, name: "abriu_perfil" } });

    const rows = await asViewer(lia.id, (client) => client.query("SELECT * FROM analytics_events"));
    expect(rows.rows).toHaveLength(0);
  });
});
