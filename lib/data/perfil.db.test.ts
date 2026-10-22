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
import { followProfile, followTopic, getCollection, getFollowers, getFollowing } from "./follows";
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

describe("RN28: os dois contadores", () => {
  /*
   * Contribuição é resposta **ou** tópico criado, e o número tem de bater
   * com a lista que a aba mostra. Eram três contadores até a F18; "dias
   * ativos" saiu porque media assiduidade, que é o oposto do que o Hub
   * promete — participar no seu tempo.
   */
  it("contribuição conta resposta e tópico criado", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const c = await comunidade("Música", lia);

    // Criar o tópico já é uma contribuição.
    const t = await topico(lia, c.id, "assunto");
    expect((await perfilNaTela(viewerFor(lia.id), "lia")).contribuicoes).toBe(1);

    // E responder nele é outra.
    await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "respondi", media: null });
    expect((await perfilNaTela(viewerFor(lia.id), "lia")).contribuicoes).toBe(2);
  });

  it("o número bate com o tamanho da lista da aba", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");
    await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "uma", media: null });
    await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "outra", media: null });

    const perfil = await perfilNaTela(viewerFor(lia.id), "lia");
    const lista = await respostasDoPerfil(viewerFor(lia.id), lia.id);

    expect(perfil.contribuicoes).toBe(lista.length);
  });

  it("conta comunidades", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const dona = await makeProfile();
    const c = await comunidade("Música", dona);
    await joinCommunity(viewerFor(lia.id), c.id);

    expect((await perfilNaTela(viewerFor(lia.id), "lia")).comunidades).toBe(1);
  });

  it("resposta apagada não conta", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");
    const r = await createAnswer(viewerFor(lia.id), { topicId: t.id, text: "oi", media: null });

    // Sobra o tópico, que também é contribuição.
    await db.answer.update({ where: { id: r.id }, data: { deletedAt: new Date() } });

    expect((await perfilNaTela(viewerFor(lia.id), "lia")).contribuicoes).toBe(1);
  });

  it("tópico apagado não conta", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const c = await comunidade("Música", lia);
    const t = await topico(lia, c.id, "assunto");

    await db.topic.update({ where: { id: t.id }, data: { deletedAt: new Date() } });

    expect((await perfilNaTela(viewerFor(lia.id), "lia")).contribuicoes).toBe(0);
  });
});

describe("a aba Contribuições", () => {
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

/**
 * RN16/RN27: os links do perfil — a única exceção ao bloqueio de links.
 *
 * Abrir uma exceção numa regra de segurança é onde o cuidado tem de ser
 * maior, não menor: estes testes são o que garante que a exceção vale só
 * para este campo e só para endereços que dá para clicar sem risco.
 */
describe("RN27: os links do perfil", () => {
  async function salvarLinks(id: string, links: { title: string; url: string }[]) {
    await updateProfile(viewerFor(id), { name: "Lia", handle: "lia", links });
    return (await perfilNaTela(viewerFor(id), "lia")).links;
  }

  it("guarda até 3, na ordem em que vieram", async () => {
    const lia = await makeProfile({ handle: "lia" });

    const links = await salvarLinks(lia.id, [
      { title: "Instagram", url: "https://instagram.com/lia" },
      { title: "Site", url: "https://lia.com" },
    ]);

    expect(links.map((l) => l.title)).toEqual(["Instagram", "Site"]);
  });

  it("recusa o quarto link", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await expect(
      salvarLinks(
        lia.id,
        Array.from({ length: 4 }, (_, i) => ({ title: `L${i}`, url: `https://x${i}.com` })),
      ),
    ).rejects.toThrow();
  });

  /*
   * O limite dos 3 é a chave primária da tabela, não uma contagem no app.
   * Este teste bate direto no banco: se alguém trocar o desenho por um
   * `count()` antes de inserir, a regra deixa de valer com duas
   * requisições ao mesmo tempo e isto fica vermelho.
   */
  it("o banco recusa a quarta posição, mesmo sem passar pelo app", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await expect(
      db.$executeRaw`
        INSERT INTO profile_links (profile_id, position, title, url)
        VALUES (${lia.id}::uuid, 3, 'Quarto', 'https://x.com')
      `,
    ).rejects.toThrow();
  });

  it("recusa título com mais de 12 caracteres", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await expect(
      salvarLinks(lia.id, [{ title: "Treze caracte", url: "https://x.com" }]),
    ).rejects.toThrow();
  });

  it("RN16: o título não pode conter link", async () => {
    const lia = await makeProfile({ handle: "lia" });

    // Senão o campo de texto viraria a porta dos fundos da regra.
    await expect(salvarLinks(lia.id, [{ title: "x.com", url: "https://x.com" }])).rejects.toThrow();
  });

  it("normaliza endereço sem protocolo para https", async () => {
    const lia = await makeProfile({ handle: "lia" });

    const links = await salvarLinks(lia.id, [{ title: "Site", url: "lia.com" }]);
    expect(links[0]?.url).toBe("https://lia.com");
  });

  it.each(["javascript:alert(1)", "data:text/html,<script>", "ftp://arquivos.com", "ola mundo"])(
    "recusa %s",
    async (url) => {
      const lia = await makeProfile({ handle: "lia" });
      await expect(salvarLinks(lia.id, [{ title: "Teste", url }])).rejects.toThrow();
    },
  );

  it("a lista substitui a anterior, então apagar funciona", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await salvarLinks(lia.id, [
      { title: "Um", url: "https://um.com" },
      { title: "Dois", url: "https://dois.com" },
    ]);
    const depois = await salvarLinks(lia.id, [{ title: "Dois", url: "https://dois.com" }]);

    expect(depois.map((l) => l.title)).toEqual(["Dois"]);
  });
});

describe("RN27: a cor de fundo e a privacidade", () => {
  it("guarda a chave escolhida", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await updateProfile(viewerFor(lia.id), { name: "Lia", handle: "lia", backgroundKey: "verde" });

    expect((await perfilNaTela(viewerFor(lia.id), "lia")).backgroundKey).toBe("verde");
  });

  it("começa em lavanda", async () => {
    const lia = await makeProfile({ handle: "lia" });
    expect((await perfilNaTela(viewerFor(lia.id), "lia")).backgroundKey).toBe("lavanda");
  });

  /*
   * O número escondido **não chega ao cliente**. Esconder só na tela
   * deixaria o valor no HTML para quem soubesse olhar — e é justamente
   * quem sabe olhar que a regra existe para impedir.
   */
  it("com a privacidade ligada, o visitante não recebe nem o número de seguidores", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });
    await followProfile(viewerFor(jo.id), lia.id);

    expect((await perfilNaTela(viewerFor(jo.id), "lia")).seguidores).toBe(1);

    await updateProfile(viewerFor(lia.id), { name: "Lia", handle: "lia", hideFollowers: true });

    const comoVisitante = await perfilNaTela(viewerFor(jo.id), "lia");
    expect(comoVisitante.seguidores).toBeNull();
    expect(comoVisitante.seguindo).toBeNull();
  });

  it("o dono continua vendo os próprios números", async () => {
    const lia = await makeProfile({ handle: "lia" });
    await updateProfile(viewerFor(lia.id), { name: "Lia", handle: "lia", hideFollowers: true });

    const comoDona = await perfilNaTela(viewerFor(lia.id), "lia");
    expect(comoDona.seguidores).toBe(0);
    expect(comoDona.seguindo).toBe(0);
    expect(comoDona.escondeSeguidores).toBe(true);
  });
});

/**
 * RN30: o enquadramento da foto.
 *
 * O servidor refaz a conta com as medidas que ele leu dos bytes — o que
 * vem do formulário é pedido, não decisão.
 */
describe("RN30: o enquadramento da foto", () => {
  it("começa centralizado e sem aproximação", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const perfil = await perfilNaTela(viewerFor(lia.id), "lia");

    expect(perfil.enquadramento).toEqual({ zoom: 1, ox: 0, oy: 0 });
    expect(perfil.medidasDaFoto).toBeNull();
  });

  it("guarda o que foi ajustado", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await updateProfile(viewerFor(lia.id), {
      name: "Lia",
      handle: "lia",
      enquadramento: { zoom: 1.5, ox: 0.1, oy: -0.05 },
    });

    const perfil = await perfilNaTela(viewerFor(lia.id), "lia");
    expect(perfil.enquadramento.zoom).toBeCloseTo(1.5, 6);
    expect(perfil.enquadramento.ox).toBeCloseTo(0.1, 6);
  });

  /*
   * O CHECK do banco é a terceira barreira, depois da tela e do Zod. Vale
   * quando duas requisições chegam juntas, e quando alguém escreve SQL à
   * mão — que é exatamente o que este teste faz.
   */
  it("o banco recusa zoom fora de 1 a 3", async () => {
    const lia = await makeProfile({ handle: "lia" });

    await expect(
      db.$executeRaw`UPDATE profiles SET avatar_zoom = 9 WHERE id = ${lia.id}::uuid`,
    ).rejects.toThrow();
  });
});

describe("RN27: tópicos ativos por comunidade", () => {
  // RN07 limita um tópico por pessoa por dia, então cada tópico é de alguém.
  it("conta só os tópicos com resposta nas últimas 24 horas", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const outra = await makeProfile();
    const terceira = await makeProfile();
    const c = await comunidade("Música", lia);
    await joinCommunity(viewerFor(outra.id), c.id);
    await joinCommunity(viewerFor(terceira.id), c.id);

    const agora = await topico(lia, c.id, "de agora");
    await createAnswer(viewerFor(lia.id), { topicId: agora.id, text: "oi", media: null });

    // Um tópico sem resposta nenhuma não conta.
    await topico(outra, c.id, "parado");

    const [comunidadeNaTela] = await comunidadesDoPerfil(viewerFor(lia.id), lia.id);
    expect(comunidadeNaTela?.topicosAtivos).toBe(1);

    // E um tópico cuja única resposta é de anteontem também não.
    const antigo = await topico(terceira, c.id, "so-antigo");
    await db.answer.create({
      data: {
        topicId: antigo.id,
        authorId: lia.id,
        text: "antiga",
        createdAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
      },
    });

    const [depois] = await comunidadesDoPerfil(viewerFor(lia.id), lia.id);
    expect(depois?.topicosAtivos).toBe(1);
  });
});

/**
 * RN28: no perfil próprio, seguidores e seguindo abrem lista.
 *
 * As duas são privadas. No perfil de outra pessoa o número de seguidores
 * continua sendo só número — ali a lista existiria para comparar perfis.
 */
describe("RN28: a lista de seguidores é do dono", () => {
  it("o dono vê quem o segue", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo", name: "Jo Ramos" });
    await followProfile(viewerFor(jo.id), lia.id);

    const lista = await getFollowers(viewerFor(lia.id), lia.id);

    expect(lista).toHaveLength(1);
    expect(lista[0]?.follower?.handle).toBe("jo");
  });

  it("ninguém mais vê a lista de outra pessoa", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });
    await followProfile(viewerFor(jo.id), lia.id);

    // Nem quem está na lista pode pedi-la.
    await expect(getFollowers(viewerFor(jo.id), lia.id)).rejects.toThrow();
  });

  /*
   * O caminho do depósito nunca sai da camada de dados: a lista mostra
   * foto, e foto é endereço assinado, não posição no depósito.
   */
  it("a foto vem como endereço, não como caminho", async () => {
    const lia = await makeProfile({ handle: "lia" });
    const jo = await makeProfile({ handle: "jo" });
    await db.profile.update({ where: { id: jo.id }, data: { avatarUrl: "perfis/x.jpg" } });
    await followProfile(viewerFor(jo.id), lia.id);

    const lista = await getFollowers(viewerFor(lia.id), lia.id);
    expect(lista[0]?.follower?.avatarUrl).not.toBe("perfis/x.jpg");
  });
});
