import { afterAll, beforeEach, describe, expect, it } from "vitest";
import sharp from "sharp";
import { db, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import { getTopicForViewer } from "./topics";
import { viewerFor } from "./viewer";
import { guardarImagem } from "@/lib/midia/deposito";

/**
 * A mídia da abertura volta do banco pronta para desenhar.
 *
 * `media_url` e `media_kind` existiam desde a F08 e eram **gravados e nunca
 * lidos**: nenhuma consulta os devolvia. O PO reclamou dos botões
 * desativados em 12 de novembro de 2026, e a correção não era ligá-los —
 * faltava a volta inteira.
 */

beforeEach(resetDatabase);
afterAll(() => db.$disconnect());

async function topicoComImagem() {
  const eu = await makeProfile();
  const universo = await makeUniverse("Som");
  const comunidade = await makeCommunity(universo.id, eu.id);

  const png = new Uint8Array(
    await sharp({ create: { width: 80, height: 60, channels: 3, background: "#334455" } })
      .png()
      .toBuffer(),
  );
  const guardada = await guardarImagem(png, "topicos");

  const topico = await db.topic.create({
    data: {
      communityId: comunidade.id,
      authorId: eu.id,
      name: "com imagem",
      description: "pergunta",
      mediaUrl: guardada.caminho,
      mediaKind: "image",
      mediaWidth: guardada.medidas.largura,
      mediaHeight: guardada.medidas.altura,
      cycleDate: new Date(),
    },
  });

  return { eu, topico, guardada };
}

describe("a mídia da abertura volta assinada", () => {
  it("o endereço vem pronto, e não o caminho cru", async () => {
    const { eu, topico } = await topicoComImagem();

    const dados = await getTopicForViewer(viewerFor(eu.id), topico.id, { comRespostas: false });

    expect(dados.midiaDaAbertura, "sem endereço a tela não desenha nada").toBeTruthy();
    // Caminho cru o navegador procura ao lado da página, não acha, e não
    // mostra — sem erro nenhum. Foi o que a foto de perfil teve da F02 à F12.
    expect(dados.midiaDaAbertura).toMatch(/^https?:\/\//);
  });

  it("o tipo e as medidas voltam junto", async () => {
    const { eu, topico } = await topicoComImagem();

    const dados = await getTopicForViewer(viewerFor(eu.id), topico.id, { comRespostas: false });

    expect(dados.tipoDaMidiaDaAbertura).toBe("image");
    // Sem as medidas o cartão da abertura pula quando a imagem chega.
    expect(dados.medidasDaMidiaDaAbertura).toEqual({ largura: 80, altura: 60 });
  });

  it("tópico sem mídia volta nulo em tudo, sem erro", async () => {
    const eu = await makeProfile();
    const universo = await makeUniverse("Som");
    const comunidade = await makeCommunity(universo.id, eu.id);
    const topico = await db.topic.create({
      data: {
        communityId: comunidade.id,
        authorId: eu.id,
        name: "sem imagem",
        description: "pergunta",
        cycleDate: new Date(),
      },
    });

    const dados = await getTopicForViewer(viewerFor(eu.id), topico.id, { comRespostas: false });

    expect(dados.midiaDaAbertura).toBeNull();
    expect(dados.medidasDaMidiaDaAbertura).toBeNull();
  });
});
