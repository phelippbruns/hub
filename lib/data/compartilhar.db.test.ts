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
import { followProfile, meusSeguidoresParaCompartilhar, unfollowProfile } from "./follows";
import { bloquear } from "./perfil";
import { definirQuemPodeConvidar } from "./profiles";

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

/**
 * RN18 + RN23 + RN26: quem aparece na folha de compartilhar.
 *
 * Mudou em 5 de novembro, por decisão do PO: era a lista do convite da
 * Cabine (comunidade em comum **ou** quem se segue mutuamente), e passou
 * a ser **só quem me segue**.
 *
 * Os dois filtros que sobraram não são herança: compartilhar **abre uma
 * Cabine**, então as regras do convite valem inteiras. Sem eles a folha
 * seria um caminho de volta para quem fechou a porta.
 */
describe("compartilhar lista só quem me segue", () => {
  async function quatroPessoas() {
    const eu = await makeProfile({ name: "Eu Mesmo", handle: "eu" });
    const seguidora = await makeProfile({ name: "Ana Seguidora", handle: "ana" });
    const seguida = await makeProfile({ name: "Bia Seguida", handle: "bia" });
    const colega = await makeProfile({ name: "Caio Colega", handle: "caio" });

    const universo = await makeUniverse();
    const comunidade = await makeCommunity(universo.id, eu.id);
    // Todas na mesma comunidade: é o critério **antigo**, e é o que este
    // teste precisa derrubar.
    for (const p of [seguidora, seguida, colega]) await joinAs(comunidade.id, p.id);

    await followProfile(viewerFor(seguidora.id), eu.id); // me segue
    await followProfile(viewerFor(eu.id), seguida.id); // eu sigo, sem volta

    return { eu, seguidora, seguida, colega };
  }

  const handles = async (eu: string, termo = "") =>
    (await meusSeguidoresParaCompartilhar(viewerFor(eu), termo)).map((p) => p.handle);

  it("RN18: aparece quem me segue, e só", async () => {
    const { eu } = await quatroPessoas();

    const lista = await handles(eu.id);

    expect(lista).toEqual(["ana"]);
    // Quem eu sigo sem reciprocidade, e quem só divide comunidade comigo,
    // ficam de fora — os dois apareciam na lista antiga.
    expect(lista).not.toContain("bia");
    expect(lista).not.toContain("caio");
  });

  it("RN18: a busca dentro da folha também só traz seguidores", async () => {
    const { eu } = await quatroPessoas();

    /*
     * Esta é a metade que escapa fácil: trocar a lista inicial e deixar a
     * busca na função antiga faria digitar um nome trazer de volta quem
     * não me segue — e nenhuma tela mostraria o erro.
     */
    expect(await handles(eu.id, "Caio")).toEqual([]);
    expect(await handles(eu.id, "Bia")).toEqual([]);
    expect(await handles(eu.id, "Ana")).toEqual(["ana"]);
    // Pelo @ também, como a busca da Cabine.
    expect(await handles(eu.id, "ana")).toEqual(["ana"]);
  });

  it("RN23: seguidor que não aceita convite não aparece", async () => {
    const { eu, seguidora } = await quatroPessoas();

    // Seguir é acompanhar, não é abrir a porta da Cabine.
    await definirQuemPodeConvidar(viewerFor(seguidora.id), "nobody");

    expect(await handles(eu.id)).toEqual([]);
  });

  it("RN26: seguidor bloqueado não aparece, nos dois sentidos", async () => {
    const primeiro = await quatroPessoas();
    await bloquear(viewerFor(primeiro.eu.id), primeiro.seguidora.id);
    expect(await handles(primeiro.eu.id)).toEqual([]);

    await resetDatabase();
    const segundo = await quatroPessoas();
    await bloquear(viewerFor(segundo.seguidora.id), segundo.eu.id);
    expect(await handles(segundo.eu.id)).toEqual([]);
  });

  it("deixar de seguir tira a pessoa da lista", async () => {
    const { eu, seguidora } = await quatroPessoas();
    expect(await handles(eu.id)).toEqual(["ana"]);

    await unfollowProfile(viewerFor(seguidora.id), eu.id);

    expect(await handles(eu.id)).toEqual([]);
  });
});
