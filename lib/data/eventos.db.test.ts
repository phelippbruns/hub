/**
 * Eventos (RN38).
 *
 * O critério de aceite é um: **o link da sala não sai do servidor para
 * quem não confirmou presença.** Os testes olham o que a função devolve,
 * e não a tela — esconder na tela deixaria o endereço no HTML, e um link
 * de sala aberta é um convite para quem a comunidade não chamou.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, joinAs, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  cancelarPresenca,
  confirmarPresenca,
  criarEvento,
  eventosDaComunidade,
  eventosFuturos,
} from "./eventos";
import { criarEventoSchema } from "./validation";
import { anonymous, viewerFor } from "./viewer";

beforeEach(resetDatabase);

const DAQUI_A_UMA_SEMANA = () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
const SALA = "https://meet.exemplo.com/animacao";

async function cenario() {
  const lia = await makeProfile({ handle: "lia", name: "Lia Souza" });
  const jo = await makeProfile({ handle: "jo", name: "Jo Ramos" });
  const rafa = await makeProfile({ handle: "rafa", name: "Rafa Lima" });
  const dani = await makeProfile({ handle: "dani", name: "Dani Rocha" });
  const universo = await makeUniverse("Hubverso de teste");
  const comunidade = await makeCommunity(universo.id, lia.id, "Animação");
  await joinAs(comunidade.id, jo.id);
  await joinAs(comunidade.id, rafa.id);

  const evento = await criarEvento(viewerFor(lia.id), {
    communityId: comunidade.id,
    titulo: "Encontro online: crítica de portfólio",
    descricao: "Cada pessoa mostra até 2 minutos.",
    formato: "online",
    comeca: DAQUI_A_UMA_SEMANA(),
    linkDoEncontro: SALA,
    vagas: null,
  });

  // `dani` é de fora da comunidade.
  return { lia, jo, rafa, dani, comunidade, evento };
}

describe("RN38: o link da sala só vai para quem confirmou", () => {
  it("quem não confirmou recebe nulo, e vê o resto do encontro", async () => {
    const { jo, comunidade } = await cenario();

    const [evento] = await eventosDaComunidade(viewerFor(jo.id), comunidade.id);

    expect(evento?.linkDoEncontro).toBeNull();
    expect(evento?.titulo).toBe("Encontro online: crítica de portfólio");
    expect(evento?.euVou).toBe(false);
  });

  it("depois de confirmar, o link chega", async () => {
    const { jo, comunidade, evento } = await cenario();
    await confirmarPresenca(viewerFor(jo.id), evento.id);

    const [naTela] = await eventosDaComunidade(viewerFor(jo.id), comunidade.id);
    expect(naTela?.euVou).toBe(true);
    expect(naTela?.linkDoEncontro).toBe(SALA);
  });

  it("cancelar a presença tira o link de volta", async () => {
    const { jo, comunidade, evento } = await cenario();
    await confirmarPresenca(viewerFor(jo.id), evento.id);
    await cancelarPresenca(viewerFor(jo.id), evento.id);

    const [naTela] = await eventosDaComunidade(viewerFor(jo.id), comunidade.id);
    expect(naTela?.euVou).toBe(false);
    expect(naTela?.linkDoEncontro).toBeNull();
  });

  it("visitante sem sessão nunca recebe o link", async () => {
    const { lia, comunidade, evento } = await cenario();
    await confirmarPresenca(viewerFor(lia.id), evento.id);

    const [naTela] = await eventosDaComunidade(anonymous, comunidade.id);
    expect(naTela?.linkDoEncontro).toBeNull();
    expect(naTela?.titulo).toBeTruthy();
  });

  it("quem organiza e não confirmou também não recebe — e é fácil de desfazer", async () => {
    const { lia, comunidade } = await cenario();

    const [naTela] = await eventosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(naTela?.anfitriao?.handle).toBe("lia");
    expect(naTela?.linkDoEncontro).toBeNull();
  });
});

describe("confirmar presença", () => {
  it("conta uma por pessoa, e confirmar de novo não soma", async () => {
    const { jo, comunidade, evento } = await cenario();
    await confirmarPresenca(viewerFor(jo.id), evento.id);
    await confirmarPresenca(viewerFor(jo.id), evento.id);

    const [naTela] = await eventosDaComunidade(viewerFor(jo.id), comunidade.id);
    expect(naTela?.confirmados).toBe(1);
  });

  it("o banco recusa duas linhas da mesma pessoa", async () => {
    const { jo, evento } = await cenario();
    await confirmarPresenca(viewerFor(jo.id), evento.id);

    await expect(
      db.eventAttendance.create({ data: { eventId: evento.id, profileId: jo.id } }),
    ).rejects.toThrow();
  });

  it("quem não é da comunidade não confirma", async () => {
    const { dani, evento } = await cenario();
    await expect(confirmarPresenca(viewerFor(dani.id), evento.id)).rejects.toThrow();
  });

  it("encontro que já aconteceu não aceita confirmação nem cancelamento", async () => {
    const { jo, evento } = await cenario();
    await confirmarPresenca(viewerFor(jo.id), evento.id);
    await db.event.update({
      where: { id: evento.id },
      data: { startsAt: new Date(Date.now() - 60_000) },
    });

    await expect(confirmarPresenca(viewerFor(jo.id), evento.id)).rejects.toThrow();
    await expect(cancelarPresenca(viewerFor(jo.id), evento.id)).rejects.toThrow();
  });

  it("lotado: o servidor recusa a vaga que não existe", async () => {
    const { lia, jo, rafa, comunidade } = await cenario();
    const pequeno = await criarEvento(viewerFor(lia.id), {
      communityId: comunidade.id,
      titulo: "Oficina de stop motion",
      descricao: "Material incluso.",
      formato: "presencial",
      local: "Vila Madalena, São Paulo",
      comeca: DAQUI_A_UMA_SEMANA(),
      vagas: 2,
    });

    await confirmarPresenca(viewerFor(lia.id), pequeno.id);
    await confirmarPresenca(viewerFor(jo.id), pequeno.id);
    await expect(confirmarPresenca(viewerFor(rafa.id), pequeno.id)).rejects.toThrow();

    const naTela = await eventosDaComunidade(viewerFor(rafa.id), comunidade.id);
    const esse = naTela.find((e) => e.id === pequeno.id);
    expect(esse?.lotado).toBe(true);
    expect(esse?.confirmados).toBe(2);
  });

  it("quem já está dentro não vê o encontro como lotado", async () => {
    const { lia, jo, comunidade } = await cenario();
    const pequeno = await criarEvento(viewerFor(lia.id), {
      communityId: comunidade.id,
      titulo: "Oficina",
      descricao: "",
      formato: "presencial",
      local: "Centro",
      comeca: DAQUI_A_UMA_SEMANA(),
      vagas: 2,
    });
    await confirmarPresenca(viewerFor(lia.id), pequeno.id);
    await confirmarPresenca(viewerFor(jo.id), pequeno.id);

    const naTela = await eventosDaComunidade(viewerFor(jo.id), comunidade.id);
    const esse = naTela.find((e) => e.id === pequeno.id);
    expect(esse?.lotado).toBe(false);
    expect(esse?.euVou).toBe(true);
  });
});

describe("criar o encontro", () => {
  it("presencial exige local, e o banco também cobra", async () => {
    const { lia, comunidade } = await cenario();

    await expect(
      criarEvento(viewerFor(lia.id), {
        communityId: comunidade.id,
        titulo: "Sem lugar",
        descricao: "",
        formato: "presencial",
        local: "",
        comeca: DAQUI_A_UMA_SEMANA(),
        vagas: null,
      }),
    ).rejects.toThrow();

    // E num INSERT cru, o CHECK do banco recusa igual.
    await expect(
      db.event.create({
        data: {
          communityId: comunidade.id,
          title: "Sem lugar",
          format: "presencial",
          place: "",
          startsAt: DAQUI_A_UMA_SEMANA(),
        },
      }),
    ).rejects.toThrow();
  });

  it("online não guarda local, mesmo que alguém mande um", async () => {
    const { lia, comunidade } = await cenario();
    const online = await criarEvento(viewerFor(lia.id), {
      communityId: comunidade.id,
      titulo: "Só online",
      descricao: "",
      formato: "online",
      local: "Rua que não deveria entrar",
      comeca: DAQUI_A_UMA_SEMANA(),
      vagas: null,
    });

    const guardado = await db.event.findUniqueOrThrow({ where: { id: online.id } });
    expect(guardado.place).toBe("");
  });

  it("recusa data no passado", () => {
    const resultado = criarEventoSchema.safeParse({
      communityId: "00000000-0000-4000-8000-000000000000",
      titulo: "Ontem",
      formato: "online",
      comeca: new Date(Date.now() - 60_000),
    });
    expect(resultado.success).toBe(false);
    expect(JSON.stringify(resultado.error?.issues)).toContain("futuro");
  });

  it.each([1, 501])("recusa %s vagas", (vagas) => {
    const resultado = criarEventoSchema.safeParse({
      communityId: "00000000-0000-4000-8000-000000000000",
      titulo: "Teste",
      formato: "online",
      comeca: DAQUI_A_UMA_SEMANA(),
      vagas,
    });
    expect(resultado.success).toBe(false);
  });

  it("RN16: a descrição não aceita link, mas a sala sim", () => {
    const comLinkNaDescricao = criarEventoSchema.safeParse({
      communityId: "00000000-0000-4000-8000-000000000000",
      titulo: "Teste",
      descricao: "Entre por exemplo.com",
      formato: "online",
      comeca: DAQUI_A_UMA_SEMANA(),
    });
    expect(comLinkNaDescricao.success).toBe(false);

    const comSala = criarEventoSchema.safeParse({
      communityId: "00000000-0000-4000-8000-000000000000",
      titulo: "Teste",
      descricao: "Traga algo em andamento.",
      formato: "online",
      comeca: DAQUI_A_UMA_SEMANA(),
      linkDoEncontro: SALA,
    });
    expect(comSala.success).toBe(true);
  });

  it("quem está de fora da comunidade não cria", async () => {
    const { dani, comunidade } = await cenario();
    await expect(
      criarEvento(viewerFor(dani.id), {
        communityId: comunidade.id,
        titulo: "Posso?",
        descricao: "",
        formato: "online",
        comeca: DAQUI_A_UMA_SEMANA(),
        vagas: null,
      }),
    ).rejects.toThrow();
  });
});

describe("a lista e o contador", () => {
  it("separa próximos de anteriores pela hora de começar", async () => {
    const { lia, comunidade, evento } = await cenario();
    await db.event.update({
      where: { id: evento.id },
      data: { startsAt: new Date(Date.now() - 60_000) },
    });

    const [naTela] = await eventosDaComunidade(viewerFor(lia.id), comunidade.id);
    expect(naTela?.passou).toBe(true);
    expect(await eventosFuturos(viewerFor(lia.id), comunidade.id)).toBe(0);
  });

  it("conta só os que ainda vão acontecer", async () => {
    const { lia, comunidade } = await cenario();
    expect(await eventosFuturos(viewerFor(lia.id), comunidade.id)).toBe(1);

    await criarEvento(viewerFor(lia.id), {
      communityId: comunidade.id,
      titulo: "Outro",
      descricao: "",
      formato: "online",
      comeca: DAQUI_A_UMA_SEMANA(),
      vagas: null,
    });
    expect(await eventosFuturos(viewerFor(lia.id), comunidade.id)).toBe(2);
  });
});
