/**
 * Perfil (F12): RN27, RN28 e as defesas de quem usa.
 *
 * O que estes testes protegem são as **ausências**: o que o perfil não
 * mostra é o que separa participação de popularidade (Princípio 2), e
 * ausência é o tipo de coisa que volta sem ninguém notar.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import {
  bloquear,
  comunidadesDoPerfil,
  desbloquear,
  dessilenciar,
  perfilNaTela,
  respostasDoPerfil,
  silenciar,
} from "./perfil";
import { createCommunity, joinCommunity } from "./communities";
import { createAnswer, createTopic } from "./topics";
import { followProfile, followTopic, getCollection, getFollowing } from "./follows";
import { interacoesDeQuemSigo } from "./inicio";
import { updateProfile } from "./profiles";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

async function comunidade(nome: string, dona: { id: string }) {
  const universo = await makeUniverse(`Universo ${nome}`);
  const criada = await createCommunity(viewerFor(dona.id), {
    universeId: universo.id,
    name: nome,
    intro: "intro",
    coverUrl: null,
  });
  return db.community.findUniqueOrThrow({ where: { id: criada!.id } });
}

async function topico(quem: { id: string }, communityId: string, nome: string) {
  const criado = await createTopic(viewerFor(quem.id), {
    communityId,
    name: nome,
    description: `Pergunta de ${nome}.`,
    media: null,
  });
  return db.topic.findUniqueOrThrow({ where: { id: criado!.id } });
}

describe("RN27: o que o perfil esconde", () => {
  it("visitante não vê quantas pessoas o outro segue", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });
    const outra = await makeProfile();
    await followProfile(viewerFor(lia.id), outra.id);

    const paraJo = await perfilNaTela(viewerFor(jo.id), "lia");

    /*
     * `null`, não zero. Zero diria "não segue ninguém"; nulo diz "não é da
     * sua conta", que é a regra. Quem você acompanha diz muito sobre você.
     */
    expect(paraJo.seguindo).toBeNull();
  });

  it("o dono vê quantas pessoas segue", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const outra = await makeProfile();
    await followProfile(viewerFor(lia.id), outra.id);

    expect((await perfilNaTela(viewerFor(lia.id), "lia")).seguindo).toBe(1);
  });

  it("a lista de seguindo recusa quem não é o dono", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile();

    await expect(getFollowing(viewerFor(jo.id), lia.id)).rejects.toThrow(/privada/i);
    await expect(getFollowing(viewerFor(lia.id), lia.id)).resolves.toEqual([]);
  });

  it("a Coleção recusa quem não é o dono", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile();

    await expect(getCollection(viewerFor(jo.id), lia.id)).rejects.toThrow(/privada/i);
  });

  it("seguidores é número para todo mundo, inclusive para o dono", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });
    await followProfile(viewerFor(jo.id), lia.id);

    expect((await perfilNaTela(viewerFor(jo.id), "lia")).seguidores).toBe(1);
    expect((await perfilNaTela(viewerFor(lia.id), "lia")).seguidores).toBe(1);
  });
});

describe("RN28: os três contadores", () => {
  it("dia ativo conta resposta e tópico, e o mesmo dia conta uma vez", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const c = await comunidade("Música", lia);

    // Criar o tópico e responder nele, no mesmo dia: um dia ativo.
    const t = await topico(lia, c.id, "assunto");
    await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "respondi", media: null });

    expect((await perfilNaTela(viewerFor(lia.id), "lia")).diasAtivos).toBe(1);

    // Uma resposta de outro dia: dois.
    await db.answer.create({
      data: {
        topicId: t.id,
        authorId: lia.id,
        text: "de ontem",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    });

    expect((await perfilNaTela(viewerFor(lia.id), "lia")).diasAtivos).toBe(2);
  });

  it("conta respostas e comunidades", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await joinCommunity(viewerFor(lia.id), c.id);
    const t = await topico(dona, c.id, "assunto");
    await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "oi", media: null });

    const perfil = await perfilNaTela(viewerFor(lia.id), "lia");
    expect(perfil.respostas).toBe(1);
    expect(perfil.comunidades).toBe(1);
  });

  it("resposta apagada não conta", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");
    const r = await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "oi", media: null });

    await db.answer.update({ where: { id: r.id }, data: { deletedAt: new Date() } });

    expect((await perfilNaTela(viewerFor(lia.id), "lia")).respostas).toBe(0);
  });
});

describe("a aba Respostas", () => {
  it("cada item traz o tópico e a pergunta", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await joinCommunity(viewerFor(lia.id), c.id);
    const t = await topico(dona, c.id, "primeira festa");
    await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "num galpão", media: null });

    const [item] = await respostasDoPerfil(viewerFor(lia.id), lia.id);

    // Sem o tópico e a pergunta, a frase solta não diz nada a quem chega.
    expect(item?.topico.nome).toBe("primeira festa");
    expect(item?.topico.pergunta).toBe("Pergunta de primeira festa.");
    expect(item?.texto).toBe("num galpão");
    expect(item?.criouOTopico).toBe(false);
  });

  it("os tópicos criados aparecem marcados", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const c = await comunidade("Música", lia);
    await topico(lia, c.id, "criei este");

    const [item] = await respostasDoPerfil(viewerFor(lia.id), lia.id);
    expect(item?.criouOTopico).toBe(true);
    expect(item?.texto).toBeNull();
  });
});

describe("a aba Comunidades", () => {
  it("as em comum vêm primeiro, marcadas", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile();
    const dona = await makeProfile();

    const juntas = await comunidade("Juntas", dona);
    const soDela = await comunidade("Só Dela", dona);
    for (const quem of [lia, jo]) await joinCommunity(viewerFor(quem.id), juntas.id);
    await joinCommunity(viewerFor(lia.id), soDela.id);

    const lista = await comunidadesDoPerfil(viewerFor(jo.id), lia.id);

    expect(lista.map((c) => c.nome)).toEqual(["Juntas", "Só Dela"]);
    expect(lista.map((c) => c.emComum)).toEqual([true, false]);
  });
});

describe("bloquear", () => {
  it("RN26: esconde nos dois sentidos", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });

    await bloquear(viewerFor(lia.id), jo.id);

    expect((await perfilNaTela(viewerFor(lia.id), "jo")).euBloqueei).toBe(true);
  });

  it("desfaz o seguir dos dois lados", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });
    await followProfile(viewerFor(lia.id), jo.id);
    await followProfile(viewerFor(jo.id), lia.id);

    await bloquear(viewerFor(lia.id), jo.id);

    // Um "seguindo" invisível para quem você bloqueou é estado mentiroso.
    expect(await db.follow.count({ where: { target: "profile" } })).toBe(0);
  });

  it("desbloquear devolve o acesso, mas não o seguir", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });
    await followProfile(viewerFor(lia.id), jo.id);

    await bloquear(viewerFor(lia.id), jo.id);
    await desbloquear(viewerFor(lia.id), jo.id);

    const perfil = await perfilNaTela(viewerFor(lia.id), "jo");
    expect(perfil.euBloqueei).toBe(false);
    // Seguir de novo é escolha, não consequência.
    expect(perfil.euSigo).toBe(false);
  });

  it("ninguém bloqueia a si mesmo", async () => {
    const lia = await makeProfile({ handle: "lia" });
    await expect(bloquear(viewerFor(lia.id), lia.id)).rejects.toThrow();
  });
});

describe("silenciar", () => {
  async function cenario() {
    const eu = await makeProfile({ handle: "eu" });
    const barulhenta = await makeProfile({ handle: "barulhenta" });
    const c = await comunidade("Música", barulhenta);
    const t = await topico(barulhenta, c.id, "assunto");
    await followProfile(viewerFor(eu.id), barulhenta.id);
    await createAnswer(viewerFor(barulhenta.id), { topicId: t.id, text: "oi", media: null });
    return { eu, barulhenta };
  }

  it("tira a pessoa do meu Início", async () => {
    const { eu, barulhenta } = await cenario();

    expect(await interacoesDeQuemSigo(viewerFor(eu.id))).not.toHaveLength(0);

    await silenciar(viewerFor(eu.id), barulhenta.id);
    expect(await interacoesDeQuemSigo(viewerFor(eu.id))).toHaveLength(0);
  });

  it("**não** desfaz o seguir — é o que o separa de bloquear", async () => {
    const { eu, barulhenta } = await cenario();
    await silenciar(viewerFor(eu.id), barulhenta.id);

    const perfil = await perfilNaTela(viewerFor(eu.id), "barulhenta");
    expect(perfil.euSigo).toBe(true);
    expect(perfil.euSilenciei).toBe(true);
    expect(perfil.euBloqueei).toBe(false);
  });

  it("não esconde o perfil, só o Início", async () => {
    const { eu, barulhenta } = await cenario();
    await silenciar(viewerFor(eu.id), barulhenta.id);

    // Silenciar é sobre o meu Início, não sobre o acesso dela ao Hub.
    expect(await respostasDoPerfil(viewerFor(eu.id), barulhenta.id)).not.toHaveLength(0);
  });

  it("dessilenciar traz de volta", async () => {
    const { eu, barulhenta } = await cenario();
    await silenciar(viewerFor(eu.id), barulhenta.id);
    await dessilenciar(viewerFor(eu.id), barulhenta.id);

    expect(await interacoesDeQuemSigo(viewerFor(eu.id))).not.toHaveLength(0);
  });

  it("é de cada pessoa: silenciar não afeta o Início de outra", async () => {
    const { barulhenta } = await cenario();
    const terceira = await makeProfile();
    await followProfile(viewerFor(terceira.id), barulhenta.id);

    const eu = await db.profile.findFirstOrThrow({ where: { handle: "eu" } });
    await silenciar(viewerFor(eu.id), barulhenta.id);

    expect(await interacoesDeQuemSigo(viewerFor(terceira.id))).not.toHaveLength(0);
  });
});

describe("editar o perfil", () => {
  it("recusa um @ que já existe", async () => {
    const lia = await makeProfile({ handle: "lia" });
    await makeProfile({ handle: "jo" });

    await expect(
      updateProfile(viewerFor(lia.id), { name: "Lia", handle: "jo", bio: null }),
    ).rejects.toThrow();
  });

  it("RN16: recusa link na descrição", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await expect(
      updateProfile(viewerFor(lia.id), { name: "Lia", bio: "me acha em meusite.com" }),
    ).rejects.toThrow(/RN16|links/i);
  });

  it("salvar sem mexer na foto não apaga a foto", async () => {
    const lia = await makeProfile({ handle: "lia" });
    await db.profile.update({
      where: { id: lia.id },
      data: { avatarUrl: "perfis/minha-foto.jpg" },
    });

    /*
     * A foto é enviada por um caminho diferente do nome e da descrição.
     * Antes, campo ausente virava `null`, então salvar o formulário sem
     * trocar a foto a apagava — em silêncio.
     */
    await updateProfile(viewerFor(lia.id), { name: "Lia Souza", bio: "nova descrição" });

    const depois = await db.profile.findUniqueOrThrow({ where: { id: lia.id } });
    expect(depois.avatarUrl).toBe("perfis/minha-foto.jpg");
  });

  it("trocar o @ funciona, e o perfil passa a atender no endereço novo", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await updateProfile(viewerFor(lia.id), { name: "Lia Souza", handle: "liasouza" });

    await expect(perfilNaTela(viewerFor(lia.id), "liasouza")).resolves.toMatchObject({
      handle: "liasouza",
    });
    await expect(perfilNaTela(viewerFor(lia.id), "lia")).rejects.toThrow();
  });

  it("salva nome e descrição", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await updateProfile(viewerFor(lia.id), { name: "Lia Souza", bio: "Vinil e serras." });

    const perfil = await perfilNaTela(viewerFor(lia.id), "lia");
    expect(perfil.name).toBe("Lia Souza");
    expect(perfil.bio).toBe("Vinil e serras.");
  });
});

describe("RN18: a Coleção é o que a pessoa seguiu", () => {
  it("responder não põe o tópico na Coleção", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await joinCommunity(viewerFor(lia.id), c.id);
    const t = await topico(dona, c.id, "assunto");

    await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "respondi", media: null });
    expect(await getCollection(viewerFor(lia.id), lia.id)).toEqual([]);

    // Seguir é sempre manual.
    await followTopic(viewerFor(lia.id), t.id);
    expect(await getCollection(viewerFor(lia.id), lia.id)).toHaveLength(1);
  });
});
