/**
 * Denúncia e moderação (F16).
 *
 * É a feature em que errar custa mais caro: dar poder a quem não tem, ou
 * não dar a quem precisa. Por isso cada caminho é testado pelos dois lados
 * — quem pode e quem não pode.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, joinAs, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  aceitarModeracao,
  alvoPelaUrl,
  banirPelaDenuncia,
  convidarModerador,
  denunciar,
  filaDeDenuncias,
  historicoDaModeracao,
  manterConteudo,
  membrosDaComunidade,
  recusarModeracao,
  removerConteudo,
  removerMembro,
  removerModerador,
} from "./moderacao";
import { createAnswer, createTopic, topicoPorEndereco } from "./topics";
import { joinCommunity } from "./communities";
import { viewerFor } from "./viewer";
import { getProfileByAuthId } from "./profiles";

beforeEach(resetDatabase);

/** Lia criou e modera. Jo e Rafa são membros. Dani está de fora. */
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

  const resposta = await createAnswer(viewerFor(jo.id), {
    topicId: topico.id,
    text: "resposta que vai ser denunciada",
    media: null,
  });

  return { lia, jo, rafa, dani, comunidade, topico, resposta };
}

describe("denunciar", () => {
  it("a denúncia cai na fila da comunidade certa", async () => {
    const { rafa, lia, comunidade, resposta } = await cenario();

    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "spam");

    const fila = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    expect(fila).toHaveLength(1);
    expect(fila[0]?.motivo).toBe("Spam ou golpe");
    expect(fila[0]?.alvo.trecho).toBe("resposta que vai ser denunciada");
    expect(fila[0]?.alvo.onde).toBe("primeira festa");
  });

  it("o texto livre só é guardado em 'outro motivo'", async () => {
    const { rafa, lia, resposta, topico } = await cenario();
    void lia;

    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "spam", "inventei");
    await denunciar(viewerFor(rafa.id), { tipo: "topic", id: topico.id }, "outro", "explico aqui");

    const guardadas = await db.report.findMany({ orderBy: { createdAt: "asc" } });
    // Em "spam" o rótulo já é a categoria; repetir texto livre não
    // acrescenta e só dá espaço para desabafo.
    expect(guardadas[0]?.details).toBeNull();
    expect(guardadas[1]?.details).toBe("explico aqui");
  });

  it("motivo inventado é recusado", async () => {
    const { rafa, resposta } = await cenario();

    await expect(
      denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "porque sim"),
    ).rejects.toThrow();
  });

  it("denunciar um perfil cai na comunidade que vocês dividem", async () => {
    const { rafa, jo, lia, comunidade } = await cenario();

    await denunciar(viewerFor(rafa.id), { tipo: "profile", id: jo.id }, "assedio");

    const fila = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    expect(fila[0]?.alvo.tipo).toBe("profile");
    expect(fila[0]?.alvo.autor?.handle).toBe("jo");
  });

  it("sem comunidade em comum, não há quem julgue", async () => {
    const { dani, jo } = await cenario();

    // A moderação é por comunidade: sem uma em comum, não existe alguém
    // com autoridade sobre os dois.
    await expect(
      denunciar(viewerFor(dani.id), { tipo: "profile", id: jo.id }, "spam"),
    ).rejects.toThrow();
  });

  it("a mesma coisa denunciada várias vezes conta junto", async () => {
    const { rafa, jo, lia, comunidade, resposta } = await cenario();

    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "spam");
    await denunciar(viewerFor(lia.id), { tipo: "answer", id: resposta.id }, "spam");
    void jo;

    const fila = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    expect(fila[0]?.vezes).toBe(2);
  });
});

describe("só quem modera entra", () => {
  it("membro comum não abre a fila", async () => {
    const { rafa, comunidade } = await cenario();

    // "Não encontrado", e não "sem permissão": dizer que a tela existe já
    // é contar alguma coisa.
    await expect(filaDeDenuncias(viewerFor(rafa.id), comunidade.id)).rejects.toThrow(
      /não encontrad/i,
    );
  });

  it("quem está de fora também não", async () => {
    const { dani, comunidade } = await cenario();
    await expect(membrosDaComunidade(viewerFor(dani.id), comunidade.id)).rejects.toThrow();
  });

  it("quem criou entra", async () => {
    const { lia, comunidade } = await cenario();
    expect(await membrosDaComunidade(viewerFor(lia.id), comunidade.id)).not.toHaveLength(0);
  });
});

describe("RN33: remover conteúdo", () => {
  it("some para todo mundo e avisa o autor com o motivo", async () => {
    const { lia, jo, rafa, comunidade, resposta, topico } = await cenario();
    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "spam");

    const [denuncia] = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    await removerConteudo(viewerFor(lia.id), comunidade.id, denuncia!.id);

    const naTela = await topicoPorEndereco(
      viewerFor(rafa.id),
      (await db.community.findUniqueOrThrow({ where: { id: comunidade.id } })).slug,
      topico.slug,
    );
    expect(naTela.answers?.map((r) => r.id)).not.toContain(resposta.id);

    const avisos = await db.notification.findMany({
      where: { profileId: jo.id, kind: "content_removed" },
    });
    expect(avisos).toHaveLength(1);
    expect((avisos[0]?.payload as { motivo: string }).motivo).toBe("Spam ou golpe");
  });

  it("o aviso chega mesmo com todas as notificações desligadas", async () => {
    const { lia, jo, rafa, comunidade, resposta } = await cenario();
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
    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "spam");

    const [denuncia] = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    await removerConteudo(viewerFor(lia.id), comunidade.id, denuncia!.id);

    // Saber que seu conteúdo sumiu não é preferência.
    expect(
      await db.notification.count({ where: { profileId: jo.id, kind: "content_removed" } }),
    ).toBe(1);
  });

  it("o texto livre de quem denunciou não vai no aviso", async () => {
    const { lia, jo, rafa, comunidade, resposta } = await cenario();
    await denunciar(
      viewerFor(rafa.id),
      { tipo: "answer", id: resposta.id },
      "outro",
      "esse cara é um idiota",
    );

    const [denuncia] = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    await removerConteudo(viewerFor(lia.id), comunidade.id, denuncia!.id);

    const aviso = await db.notification.findFirstOrThrow({
      where: { profileId: jo.id, kind: "content_removed" },
    });
    // Relato de uma pessoa sobre outra não viaja: chegaria sem contexto
    // nem direito de resposta.
    expect(JSON.stringify(aviso.payload)).not.toContain("idiota");
  });

  it("manter fecha a denúncia e deixa o conteúdo", async () => {
    const { lia, rafa, comunidade, resposta } = await cenario();
    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "spam");

    const [denuncia] = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    await manterConteudo(viewerFor(lia.id), comunidade.id, denuncia!.id);

    expect(await filaDeDenuncias(viewerFor(lia.id), comunidade.id)).toHaveLength(0);
    const ainda = await db.answer.findUniqueOrThrow({ where: { id: resposta.id } });
    expect(ainda.deletedAt).toBeNull();
  });

  it("a ação fica registrada", async () => {
    const { lia, rafa, comunidade, resposta } = await cenario();
    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "spam");

    const [denuncia] = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    await removerConteudo(viewerFor(lia.id), comunidade.id, denuncia!.id);

    const historico = await historicoDaModeracao(viewerFor(lia.id), comunidade.id);
    expect(historico[0]?.action).toBe("remove_answer");
    expect(historico[0]?.moderatorId).toBe(lia.id);
  });
});

describe("remover e banir membro", () => {
  it("removido pode voltar", async () => {
    const { lia, rafa, comunidade } = await cenario();

    await removerMembro(viewerFor(lia.id), comunidade.id, rafa.id, false);
    expect(
      await db.membership.findUnique({
        where: { communityId_profileId: { communityId: comunidade.id, profileId: rafa.id } },
      }),
    ).toBeNull();

    await joinCommunity(viewerFor(rafa.id), comunidade.id);
    expect(
      await db.membership.findUnique({
        where: { communityId_profileId: { communityId: comunidade.id, profileId: rafa.id } },
      }),
    ).not.toBeNull();
  });

  it("banido não entra de novo", async () => {
    const { lia, rafa, comunidade } = await cenario();

    await removerMembro(viewerFor(lia.id), comunidade.id, rafa.id, true);

    await expect(joinCommunity(viewerFor(rafa.id), comunidade.id)).rejects.toThrow();
  });

  it("banido não responde mais", async () => {
    const { lia, rafa, comunidade, topico } = await cenario();
    await removerMembro(viewerFor(lia.id), comunidade.id, rafa.id, true);

    await expect(
      createAnswer(viewerFor(rafa.id), { topicId: topico.id, text: "ainda aqui?", media: null }),
    ).rejects.toThrow();
  });

  it("quem criou a comunidade não é removido", async () => {
    const { lia, jo, comunidade } = await cenario();
    // O Jo vira moderador para tentar.
    await db.membership.update({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: jo.id } },
      data: { role: "moderator" },
    });

    await expect(removerMembro(viewerFor(jo.id), comunidade.id, lia.id, false)).rejects.toThrow(
      /criou/i,
    );
  });

  it("banir também tira da contagem", async () => {
    const { lia, rafa, comunidade } = await cenario();
    const antes = (await db.community.findUniqueOrThrow({ where: { id: comunidade.id } }))
      .membersCount;

    // O banido continua como linha no banco, então o gatilho do banco não
    // vê saída nenhuma: sem o desconto no código, a comunidade ficaria
    // anunciando uma pessoa que não pode mais entrar.
    await removerMembro(viewerFor(lia.id), comunidade.id, rafa.id, true);

    expect(
      (await db.community.findUniqueOrThrow({ where: { id: comunidade.id } })).membersCount,
    ).toBe(antes - 1);
  });

  it("a contagem de membros acompanha", async () => {
    const { lia, rafa, comunidade } = await cenario();
    const antes = (await db.community.findUniqueOrThrow({ where: { id: comunidade.id } }))
      .membersCount;

    await removerMembro(viewerFor(lia.id), comunidade.id, rafa.id, false);

    const depois = (await db.community.findUniqueOrThrow({ where: { id: comunidade.id } }))
      .membersCount;
    expect(depois).toBe(antes - 1);
  });
});

describe("moderador novo só assume depois de aceitar", () => {
  it("o convite não torna ninguém moderador", async () => {
    const { lia, rafa, comunidade } = await cenario();

    await convidarModerador(viewerFor(lia.id), comunidade.id, rafa.id);

    const membro = await db.membership.findUniqueOrThrow({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: rafa.id } },
    });
    expect(membro.role).toBe("member");
    // E ele ainda não abre a moderação.
    await expect(filaDeDenuncias(viewerFor(rafa.id), comunidade.id)).rejects.toThrow();
  });

  it("aceitar torna, e aí a tela abre", async () => {
    const { lia, rafa, comunidade } = await cenario();
    await convidarModerador(viewerFor(lia.id), comunidade.id, rafa.id);

    const convite = await db.moderatorInvite.findFirstOrThrow({ where: { inviteeId: rafa.id } });
    await aceitarModeracao(viewerFor(rafa.id), convite.id);

    expect(await filaDeDenuncias(viewerFor(rafa.id), comunidade.id)).toEqual([]);
  });

  it("recusar não torna, e o convite some", async () => {
    const { lia, rafa, comunidade } = await cenario();
    await convidarModerador(viewerFor(lia.id), comunidade.id, rafa.id);

    const convite = await db.moderatorInvite.findFirstOrThrow({ where: { inviteeId: rafa.id } });
    await recusarModeracao(viewerFor(rafa.id), convite.id);

    await expect(aceitarModeracao(viewerFor(rafa.id), convite.id)).rejects.toThrow();
  });

  it("o convite avisa quem recebeu", async () => {
    const { lia, rafa, comunidade } = await cenario();
    await convidarModerador(viewerFor(lia.id), comunidade.id, rafa.id);

    expect(
      await db.notification.count({ where: { profileId: rafa.id, kind: "moderation_changed" } }),
    ).toBe(1);
  });

  it("convidar quem já modera é recusado", async () => {
    const { lia, comunidade } = await cenario();
    await expect(convidarModerador(viewerFor(lia.id), comunidade.id, lia.id)).rejects.toThrow(
      /já modera/i,
    );
  });

  it("convidar quem não é membro é recusado", async () => {
    const { lia, dani, comunidade } = await cenario();
    await expect(convidarModerador(viewerFor(lia.id), comunidade.id, dani.id)).rejects.toThrow();
  });
});

describe("sair da moderação", () => {
  it("continua membro, e é avisado", async () => {
    const { lia, rafa, comunidade } = await cenario();
    await convidarModerador(viewerFor(lia.id), comunidade.id, rafa.id);
    const convite = await db.moderatorInvite.findFirstOrThrow({ where: { inviteeId: rafa.id } });
    await aceitarModeracao(viewerFor(rafa.id), convite.id);

    await removerModerador(viewerFor(lia.id), comunidade.id, rafa.id);

    const membro = await db.membership.findUniqueOrThrow({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: rafa.id } },
    });
    expect(membro.role).toBe("member");
    expect(membro.bannedAt).toBeNull();

    const avisos = await db.notification.findMany({
      where: { profileId: rafa.id, kind: "moderation_changed" },
    });
    // Um do convite, um da saída.
    expect(avisos).toHaveLength(2);
  });

  it("quem criou a comunidade não sai da moderação", async () => {
    const { lia, rafa, comunidade } = await cenario();
    await convidarModerador(viewerFor(lia.id), comunidade.id, rafa.id);
    const convite = await db.moderatorInvite.findFirstOrThrow({ where: { inviteeId: rafa.id } });
    await aceitarModeracao(viewerFor(rafa.id), convite.id);

    await expect(removerModerador(viewerFor(rafa.id), comunidade.id, lia.id)).rejects.toThrow(
      /criou/i,
    );
  });
});

describe("banir pela fila", () => {
  it("tira o conteúdo e a pessoa de uma vez", async () => {
    const { lia, jo, rafa, comunidade, resposta, topico } = await cenario();
    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "assedio");

    const [denuncia] = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    await banirPelaDenuncia(viewerFor(lia.id), comunidade.id, denuncia!.id);

    expect(
      (await db.answer.findUniqueOrThrow({ where: { id: resposta.id } })).deletedAt,
    ).not.toBeNull();
    // Banido, não removido: a linha fica, com a data, e é ela que impede a volta.
    const membro = await db.membership.findUniqueOrThrow({
      where: { communityId_profileId: { communityId: comunidade.id, profileId: jo.id } },
    });
    expect(membro.bannedAt).not.toBeNull();
    await expect(
      createAnswer(viewerFor(jo.id), { topicId: topico.id, text: "de volta", media: null }),
    ).rejects.toThrow();
  });

  it("o autor é avisado do que foi removido", async () => {
    const { lia, jo, rafa, comunidade, resposta } = await cenario();
    await denunciar(viewerFor(rafa.id), { tipo: "answer", id: resposta.id }, "assedio");

    const [denuncia] = await filaDeDenuncias(viewerFor(lia.id), comunidade.id);
    await banirPelaDenuncia(viewerFor(lia.id), comunidade.id, denuncia!.id);

    // Banir não engole o aviso da RN33: sair sem saber por quê é o que faz
    // a pessoa voltar com outra conta.
    const aviso = await db.notification.findFirstOrThrow({
      where: { profileId: jo.id, kind: "content_removed" },
    });
    expect((aviso.payload as { motivo: string }).motivo).toBe("Assédio ou ódio");
  });
});

describe("o alvo que a tela 26 recebe pelo endereço", () => {
  it("?resposta= mostra o texto, o tópico e quem bloquear", async () => {
    const { rafa, jo, resposta } = await cenario();

    const alvo = await alvoPelaUrl(viewerFor(rafa.id), { resposta: resposta.id });

    expect(alvo?.titulo).toBe("Denunciar resposta");
    expect(alvo?.trecho).toBe("resposta que vai ser denunciada");
    expect(alvo?.onde).toBe("Em primeira festa");
    expect(alvo?.pessoa?.id).toBe(jo.id);
  });

  it("?bloquear= abre a mesma tela, com o bloqueio na frente", async () => {
    const { rafa } = await cenario();

    const alvo = await alvoPelaUrl(viewerFor(rafa.id), { bloquear: "jo" });

    expect(alvo?.titulo).toBe("Bloquear Jo Ramos");
    expect(alvo?.focoNoBloqueio).toBe(true);
  });

  it("não dá para denunciar a si mesmo", async () => {
    const { jo } = await cenario();
    // Sem isto, o botão de bloquear apareceria apontando para a própria
    // pessoa — e `blockProfile` recusa, com um erro que ninguém entende.
    expect(await alvoPelaUrl(viewerFor(jo.id), { perfil: "jo" })).toBeNull();
  });

  it("endereço sem alvo que exista não abre tela nenhuma", async () => {
    const { rafa } = await cenario();
    expect(await alvoPelaUrl(viewerFor(rafa.id), { perfil: "ninguem" })).toBeNull();
    expect(await alvoPelaUrl(viewerFor(rafa.id), {})).toBeNull();
  });
});

describe("banimento da plataforma", () => {
  it("aparece na consulta que a sessão faz", async () => {
    const { rafa } = await cenario();

    await db.platformBan.create({ data: { profileId: rafa.id, reason: "teste" } });

    // `getViewer` trata quem tem esta linha como visitante: é o que tira a
    // pessoa de todas as escritas de uma vez, sem depender de cada tela.
    const perfil = await getProfileByAuthId(rafa.id);
    expect(perfil?.platformBan).not.toBeNull();
  });
});
