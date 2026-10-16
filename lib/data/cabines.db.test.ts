/**
 * Cabine (F13): as regras que só o banco prova.
 *
 * A privacidade das mensagens pelos dois caminhos — camada de dados e RLS —
 * já tem casos em `privacidade.db.test.ts`. Aqui ficam as regras da conversa
 * em si: quem entra, quantos cabem, o que acontece quando alguém sai, e o
 * contador de não lidas, que é novo.
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
import {
  MAXIMO_DE_PESSOAS,
  acceptInvite,
  cabinePorId,
  cancelarConvite,
  convitePorId,
  declineInvite,
  inviteToCabin,
  leaveCabin,
  listarCabines,
  marcarCabineComoLida,
  nomeDaCabine,
  sendMessage,
  sugestoesParaConvidar,
} from "./cabins";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

/** Lia, Jo e Rafa dividem uma comunidade. Dani é de fora. */
async function cenario() {
  const lia = await makeProfile({ name: "Lia Souza", handle: "lia" });
  const jo = await makeProfile({ name: "Jo Ramos", handle: "jo" });
  const rafa = await makeProfile({ name: "Rafa Lima", handle: "rafa" });
  const dani = await makeProfile({ name: "Dani Alves", handle: "dani" });

  const universo = await makeUniverse();
  const comunidade = await makeCommunity(universo.id, lia.id);
  await joinAs(comunidade.id, jo.id);
  await joinAs(comunidade.id, rafa.id);

  return { lia, jo, rafa, dani, comunidade };
}

/** Convida e aceita, que é a única forma de uma Cabine existir de verdade. */
async function cabineEntre(a: string, b: string) {
  const convite = await inviteToCabin(viewerFor(a), { inviteeId: b, message: null });
  await acceptInvite(viewerFor(b), convite!.id);
  return convite!.cabinId;
}

describe("RN20: a Cabine só começa quando o convidado aceita", () => {
  it("antes do aceite, quem foi convidado não entra na Cabine", async () => {
    const { lia, jo } = await cenario();

    const convite = await inviteToCabin(viewerFor(lia.id), {
      inviteeId: jo.id,
      message: "bora conversar?",
    });

    // A linha da Cabine existe para o convite apontar para algo, mas a pessoa
    // convidada não é participante até aceitar.
    await expect(cabinePorId(viewerFor(jo.id), convite!.cabinId)).rejects.toThrow();

    // E não aparece na lista dela.
    const { cabines, convites } = await listarCabines(viewerFor(jo.id));
    expect(cabines).toHaveLength(0);
    expect(convites).toHaveLength(1);
    expect(convites[0]?.mensagem).toBe("bora conversar?");
  });

  it("depois do aceite, os dois veem a mesma Cabine", async () => {
    const { lia, jo } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    const daLia = await cabinePorId(viewerFor(lia.id), cabinId);
    const doJo = await cabinePorId(viewerFor(jo.id), cabinId);

    expect(daLia.participantes).toHaveLength(2);
    expect(doJo.participantes).toHaveLength(2);
    // O nome é de quem está do outro lado, então difere para cada um.
    expect(daLia.nome).toBe("Jo");
    expect(doJo.nome).toBe("Lia");
  });

  it(`RN20: não passa de ${MAXIMO_DE_PESSOAS} pessoas, e o convite aberto conta`, async () => {
    const { lia, jo, rafa, comunidade } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    // Mais três entram: 5 no total.
    for (const nome of ["um", "dois", "tres"]) {
      const pessoa = await makeProfile({ handle: `p${nome}` });
      await joinAs(comunidade.id, pessoa.id);
      const convite = await inviteToCabin(viewerFor(lia.id), {
        inviteeId: pessoa.id,
        cabinId,
        message: null,
      });
      await acceptInvite(viewerFor(pessoa.id), convite!.id);
    }

    const cheia = await cabinePorId(viewerFor(lia.id), cabinId);
    expect(cheia.participantes).toHaveLength(MAXIMO_DE_PESSOAS);

    await expect(
      inviteToCabin(viewerFor(lia.id), { inviteeId: rafa.id, cabinId, message: null }),
    ).rejects.toThrow(/RN20|máximo/i);
  });
});

describe("RN21: só quem divide comunidade", () => {
  it("convidar alguém de fora é recusado", async () => {
    const { lia, dani } = await cenario();

    await expect(
      inviteToCabin(viewerFor(lia.id), { inviteeId: dani.id, message: null }),
    ).rejects.toThrow(/RN21|comunidade/i);
  });

  it("as sugestões trazem quem divide comunidade, com os nomes delas", async () => {
    const { lia, jo, dani, comunidade } = await cenario();

    const sugeridas = await sugestoesParaConvidar(viewerFor(lia.id));
    const ids = sugeridas.map((p) => p.id);

    expect(ids).toContain(jo.id);
    expect(ids, "Dani não divide comunidade nenhuma").not.toContain(dani.id);

    const oJo = sugeridas.find((p) => p.id === jo.id);
    expect(oJo?.emComum).toContain(comunidade.name);
  });

  it("RN23: quem não aceita convite não é sugerido", async () => {
    const { lia, jo } = await cenario();
    await db.profile.update({ where: { id: jo.id }, data: { invitePolicy: "nobody" } });

    const sugeridas = await sugestoesParaConvidar(viewerFor(lia.id));

    // Oferecer alguém que o servidor vai recusar é prometer o que não dá.
    expect(sugeridas.map((p) => p.id)).not.toContain(jo.id);
    await expect(
      inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null }),
    ).rejects.toThrow();
  });

  it("RN26: quem bloqueou não é sugerido, nos dois sentidos", async () => {
    const { lia, jo, rafa } = await cenario();
    await db.block.create({ data: { blockerId: lia.id, blockedId: jo.id } });
    await db.block.create({ data: { blockerId: rafa.id, blockedId: lia.id } });

    const sugeridas = await sugestoesParaConvidar(viewerFor(lia.id));
    const ids = sugeridas.map((p) => p.id);

    expect(ids, "quem eu bloqueei").not.toContain(jo.id);
    expect(ids, "quem me bloqueou").not.toContain(rafa.id);
  });
});

describe("RN22: o convite fica aberto até a resposta", () => {
  it("a recusa é silenciosa: quem convidou não vê sinal nenhum", async () => {
    const { lia, jo } = await cenario();
    const convite = await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });

    await declineInvite(viewerFor(jo.id), convite!.id);

    // Para quem convidou, nada aparece: nem Cabine, nem aviso de recusa.
    const daLia = await listarCabines(viewerFor(lia.id));
    expect(daLia.cabines).toHaveLength(0);
    expect(daLia.convites).toHaveLength(0);

    // E some da caixa de quem recusou.
    const doJo = await listarCabines(viewerFor(jo.id));
    expect(doJo.convites).toHaveLength(0);
  });

  it("quem convidou cancela, e o convite some para quem ia receber", async () => {
    const { lia, jo } = await cenario();
    const convite = await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });

    await cancelarConvite(viewerFor(lia.id), convite!.id);

    expect((await listarCabines(viewerFor(jo.id))).convites).toHaveLength(0);
    // E não dá mais para aceitar o que foi cancelado.
    await expect(acceptInvite(viewerFor(jo.id), convite!.id)).rejects.toThrow();
  });

  it("só quem convidou cancela", async () => {
    const { lia, jo } = await cenario();
    const convite = await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });

    await expect(cancelarConvite(viewerFor(jo.id), convite!.id)).rejects.toThrow();
  });

  it("o convite diz por que aquela pessoa pôde convidar", async () => {
    const { lia, jo, comunidade } = await cenario();
    const convite = await inviteToCabin(viewerFor(lia.id), {
      inviteeId: jo.id,
      message: "vi sua resposta",
    });

    const naTela = await convitePorId(viewerFor(jo.id), convite!.id);

    expect(naTela.quem.nome).toBe("Lia Souza");
    expect(naTela.quem.primeiroNome).toBe("Lia");
    expect(naTela.mensagem).toBe("vi sua resposta");
    expect(naTela.emComum.map((c) => c.name)).toContain(comunidade.name);
  });

  it("o convite de outra pessoa não é legível", async () => {
    const { lia, jo, rafa } = await cenario();
    const convite = await inviteToCabin(viewerFor(lia.id), { inviteeId: jo.id, message: null });

    await expect(convitePorId(viewerFor(rafa.id), convite!.id)).rejects.toThrow();
  });
});

describe("RN24: sair da Cabine", () => {
  it("com uma pessoa restante, a Cabine encerra", async () => {
    const { lia, jo } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    await leaveCabin(viewerFor(jo.id), cabinId);

    const cabin = await db.cabin.findUniqueOrThrow({ where: { id: cabinId } });
    expect(cabin.closedAt).not.toBeNull();

    // E some da lista de quem ficou: conversa encerrada não é conversa.
    expect((await listarCabines(viewerFor(lia.id))).cabines).toHaveLength(0);
  });

  it("quem saiu não lê mais, e não volta sozinho", async () => {
    const { lia, jo, rafa, comunidade } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    // Rafa entra, para a Cabine não encerrar quando o Jo sair.
    void comunidade;
    const convite = await inviteToCabin(viewerFor(lia.id), {
      inviteeId: rafa.id,
      cabinId,
      message: null,
    });
    await acceptInvite(viewerFor(rafa.id), convite!.id);

    await leaveCabin(viewerFor(jo.id), cabinId);

    await expect(cabinePorId(viewerFor(jo.id), cabinId)).rejects.toThrow();
    await expect(
      sendMessage(viewerFor(jo.id), { cabinId, text: "ainda estou aqui?" }),
    ).rejects.toThrow();
  });
});

describe("o contador de não lidas", () => {
  it("conta o que veio de outra pessoa, e zera ao abrir", async () => {
    const { lia, jo } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    await sendMessage(viewerFor(jo.id), { cabinId, text: "oi" });
    await sendMessage(viewerFor(jo.id), { cabinId, text: "tudo bem?" });

    const antes = await listarCabines(viewerFor(lia.id));
    expect(antes.cabines[0]?.naoLidas).toBe(2);
    expect(antes.cabines[0]?.previa).toBe("Jo: tudo bem?");

    await marcarCabineComoLida(viewerFor(lia.id), cabinId);

    const depois = await listarCabines(viewerFor(lia.id));
    expect(depois.cabines[0]?.naoLidas).toBe(0);
  });

  it("a própria mensagem nunca conta como não lida", async () => {
    const { lia, jo } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    await marcarCabineComoLida(viewerFor(lia.id), cabinId);
    await sendMessage(viewerFor(lia.id), { cabinId, text: "falando sozinha" });

    const lista = await listarCabines(viewerFor(lia.id));
    expect(lista.cabines[0]?.naoLidas).toBe(0);
    expect(lista.cabines[0]?.previa).toBe("Você: falando sozinha");
  });

  it("a prévia diz o tipo quando não há texto", async () => {
    const { lia, jo } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);

    await sendMessage(viewerFor(jo.id), {
      cabinId,
      media: { caminho: "https://media.giphy.com/x.gif", kind: "gif" },
    });

    expect((await listarCabines(viewerFor(lia.id))).cabines[0]?.previa).toBe("Jo: GIF");
  });
});

describe("o nome da Cabine é montado na hora", () => {
  it.each([
    [[], "Conversa"],
    [["Lia Souza"], "Lia"],
    [["Lia Souza", "Jo Ramos"], "Lia e Jo"],
    [["Lia Souza", "Jo Ramos", "Rafa Lima"], "Lia, Jo e mais 1"],
    [["Lia Souza", "Jo Ramos", "Rafa Lima", "Bia Torres"], "Lia, Jo e mais 2"],
  ])("%s vira %s", (nomes, esperado) => {
    expect(nomeDaCabine(nomes)).toBe(esperado);
  });
});

describe("o Realtime é guardado pelo RLS, não pelo Prisma", () => {
  it("quem não participa não lê messages pela conexão do navegador", async () => {
    const { lia, jo, rafa } = await cenario();
    const cabinId = await cabineEntre(lia.id, jo.id);
    await sendMessage(viewerFor(lia.id), { cabinId, text: "conversa privada" });

    /*
     * É este caminho que o Realtime usa: papel `authenticated`, sem passar
     * pela camada de dados. Se o RLS falhar aqui, a assinatura entrega
     * mensagem de Cabine alheia para qualquer pessoa logada.
     */
    const doRafa = await asViewer(rafa.id, (client) =>
      client.query("SELECT id FROM messages WHERE cabin_id = $1", [cabinId]),
    );
    expect(doRafa.rows).toHaveLength(0);

    const daLia = await asViewer(lia.id, (client) =>
      client.query("SELECT id FROM messages WHERE cabin_id = $1", [cabinId]),
    );
    expect(daLia.rows).toHaveLength(1);
  });

  it("`messages` está publicada no Realtime, com a linha inteira", async () => {
    /*
     * Sem a publicação, o navegador assina, não dá erro nenhum e nunca
     * recebe nada — o sintoma mais confuso possível. E sem REPLICA IDENTITY
     * FULL o evento não carrega `cabin_id`, então o RLS do Realtime não
     * consegue decidir quem pode receber.
     */
    const publicada = await db.$queryRaw<{ existe: boolean }[]>`
      SELECT EXISTS (
        SELECT 1 FROM pg_publication_tables
         WHERE pubname = 'supabase_realtime'
           AND schemaname = 'public'
           AND tablename = 'messages'
      ) AS existe
    `;
    expect(publicada[0]?.existe, "messages não está publicada no Realtime").toBe(true);

    // `relreplident` é `char` no Postgres, e o Prisma não sabe ler esse tipo
    // em consulta crua. O `::text` é para ele, não para o banco.
    const identidade = await db.$queryRaw<{ relreplident: string }[]>`
      SELECT c.relreplident::text AS relreplident
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'messages'
    `;
    expect(identidade[0]?.relreplident, "messages precisa de REPLICA IDENTITY FULL").toBe("f");
  });
});
