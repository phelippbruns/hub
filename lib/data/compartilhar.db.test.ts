/**
 * Compartilhar (F14): o que a camada de dados garante.
 *
 * A tela de convite é jornada — só o navegador prova que o texto das
 * respostas não chega a quem não tem conta. Aqui ficam as regras de enviar
 * o cartão para alguém.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, joinAs, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import { acceptInvite, cabineAbertaCom, inviteToCabin, leaveCabin } from "./cabins";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

async function cenario() {
  const lia = await makeProfile({ name: "Lia Souza", handle: "lia" });
  const jo = await makeProfile({ name: "Jo Ramos", handle: "jo" });
  const rafa = await makeProfile({ name: "Rafa Lima", handle: "rafa" });

  const universo = await makeUniverse();
  const comunidade = await makeCommunity(universo.id, lia.id);
  await joinAs(comunidade.id, jo.id);
  await joinAs(comunidade.id, rafa.id);

  return { lia, jo, rafa, comunidade };
}

/** Convida e aceita, que é a única forma de uma Cabine existir. */
async function cabineEntre(a: string, b: string) {
  const convite = await inviteToCabin(viewerFor(a), { inviteeId: b, message: null });
  await acceptInvite(viewerFor(b), convite!.id);
  return convite!.cabinId;
}

describe("a Cabine que já existe é reusada", () => {
  it("acha a conversa de duas pessoas que já está aberta", async () => {
    const { lia, jo } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    expect(await cabineAbertaCom(viewerFor(lia.id), jo.id)).toBe(cabinId);
    // Dos dois lados: quem compartilha pode ser qualquer um.
    expect(await cabineAbertaCom(viewerFor(jo.id), lia.id)).toBe(cabinId);
  });

  it("sem Cabine, não inventa nenhuma", async () => {
    const { lia, rafa } = await cenario();
    expect(await cabineAbertaCom(viewerFor(lia.id), rafa.id)).toBeNull();
  });

  it("convite pendente não conta: a Cabine ainda não começou (RN20)", async () => {
    const { lia, jo } = await cenario();
    await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });

    // A linha da Cabine existe para o convite apontar, mas ela tem uma
    // pessoa só. Mandar o cartão para lá seria mandar para o vazio.
    expect(await cabineAbertaCom(viewerFor(lia.id), jo.id)).toBeNull();
  });

  it("Cabine de três não serve: o link iria para quem não foi escolhido", async () => {
    const { lia, jo, rafa } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    const convite = await inviteToCabin(viewerFor(lia.id), {
      inviteeId: rafa.id,
      cabinId,
      message: null,
    });
    await acceptInvite(viewerFor(rafa.id), convite!.id);

    expect(await cabineAbertaCom(viewerFor(lia.id), jo.id)).toBeNull();
  });

  it("Cabine encerrada não é reusada", async () => {
    const { lia, jo } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    await leaveCabin(viewerFor(jo.id), cabinId);

    expect(await cabineAbertaCom(viewerFor(lia.id), jo.id)).toBeNull();
  });

  it("quem saiu não recebe mais nada por lá", async () => {
    const { lia, jo, rafa, comunidade } = await cenario();
    void comunidade;
    const cabinId = await cabineEntre(lia.id, jo.id);

    const convite = await inviteToCabin(viewerFor(lia.id), {
      inviteeId: rafa.id,
      cabinId,
      message: null,
    });
    await acceptInvite(viewerFor(rafa.id), convite!.id);
    await leaveCabin(viewerFor(rafa.id), cabinId);

    expect(await cabineAbertaCom(viewerFor(lia.id), rafa.id)).toBeNull();
    // E a de duas pessoas voltou a valer.
    expect(await cabineAbertaCom(viewerFor(lia.id), jo.id)).toBe(cabinId);
  });
});

describe("o cartão compartilhado", () => {
  it("guarda a comunidade, e a conversa sabe desenhá-la", async () => {
    const { lia, jo, comunidade } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    await db.message.create({
      data: { cabinId, authorId: lia.id, sharedCommunityId: comunidade.id },
    });

    const { listMessages } = await import("./cabins");
    const mensagens = await listMessages(viewerFor(jo.id), cabinId);
    const cartao = mensagens.at(-1)?.compartilhado;

    expect(cartao?.tipo).toBe("comunidade");
    expect(cartao?.nome).toBe(comunidade.name);
    expect(cartao?.href).toBe(`/c/${comunidade.slug}`);
  });
});
