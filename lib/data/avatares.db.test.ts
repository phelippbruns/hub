/**
 * A foto de perfil chega na tela como endereço, nunca como caminho.
 *
 * `profiles.avatar_url` guarda o caminho no depósito (`perfis/x.jpg`), porque
 * o depósito é privado e o endereço é assinado na hora de desenhar. Quem
 * devolve o caminho cru devolve algo que o navegador procura ao lado da
 * página, não acha, e não mostra — **sem erro nenhum**.
 *
 * Foi o que aconteceu da F02 à F12: só `perfilNaTela` assinava, então a foto
 * aparecia na página da pessoa e em nenhum outro lugar. Resposta, autor do
 * tópico, lista da comunidade, busca de pessoas e lista de seguindo
 * entregavam caminho.
 *
 * Este arquivo é a barreira. Cada consulta que devolve gente aparece aqui, e
 * a conferência é sempre a mesma: o que sai **não** pode parecer caminho de
 * depósito. Consulta nova que devolva pessoa entra nesta lista.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeCommunity, makeProfile, makeUniverse, resetDatabase } from "./testing/db";
import { getTopicForViewer, createTopic, createAnswer, listTopicsOfCommunity } from "./topics";
import { joinCommunity } from "./communities";
import { followProfile, getFollowing } from "./follows";
import { getProfileForViewer } from "./profiles";
import { perfilNaTela } from "./perfil";
import { buscarPessoas } from "./descoberta";
import { viewerFor } from "./viewer";

beforeEach(resetDatabase);

/** O caminho que o banco guarda. Serve de isca: se sair assim, falhou. */
const CAMINHO = "perfis/foto-de-teste.jpg";

/**
 * Assinar exige o depósito do Supabase, que os testes de banco não têm.
 * Sem ele, `enderecoDeMidia` devolve `null` — e `null` **também** prova o
 * ponto: o caminho cru não vazou. O que não pode é sair `perfis/…`.
 */
function naoVazouCaminho(valor: string | null | undefined, onde: string) {
  expect(valor ?? null, `${onde} devolveu o caminho do depósito em vez de um endereço`).not.toBe(
    CAMINHO,
  );
  if (valor) {
    expect(valor.startsWith("perfis/"), `${onde} devolveu caminho de depósito`).toBe(false);
  }
}

async function cenario() {
  const lia = await makeProfile({ name: "Lia Souza", handle: "liafoto" });
  const jo = await makeProfile({ name: "Jo Ramos", handle: "jofoto" });

  // As duas com foto: o caminho é o que o upload grava.
  await db.profile.updateMany({
    where: { id: { in: [lia.id, jo.id] } },
    data: { avatarUrl: CAMINHO },
  });

  const universo = await makeUniverse("Fotos");
  const comunidade = await makeCommunity(universo.id, lia.id);
  await joinCommunity(viewerFor(jo.id), comunidade.id);

  const criado = await createTopic(viewerFor(lia.id), {
    communityId: comunidade.id,
    name: "tópico com foto",
    description: "A abertura do tópico.",
    media: null,
  });
  const topico = await db.topic.findUniqueOrThrow({ where: { id: criado!.id } });

  await createAnswer(viewerFor(jo.id), {
    topicId: topico.id,
    text: "respondendo com foto no perfil",
    media: null,
  });

  return { lia, jo, comunidade, topico };
}

describe("nenhuma consulta devolve caminho cru de avatar", () => {
  it("o autor do tópico", async () => {
    const { lia, topico } = await cenario();

    const naTela = await getTopicForViewer(viewerFor(lia.id), topico.id);

    naoVazouCaminho(naTela.author?.avatarUrl, "getTopicForViewer (autor do tópico)");
  });

  it("o autor de cada resposta", async () => {
    const { lia, topico } = await cenario();

    const naTela = await getTopicForViewer(viewerFor(lia.id), topico.id);
    const resposta = naTela.answers?.[0];

    expect(resposta, "o cenário devia ter uma resposta").toBeDefined();
    naoVazouCaminho(resposta?.author?.avatarUrl, "listAnswers (autor da resposta)");
  });

  it("o autor dos tópicos da comunidade", async () => {
    const { lia, comunidade } = await cenario();

    const topicos = await listTopicsOfCommunity(viewerFor(lia.id), comunidade.id);

    expect(topicos.length).toBeGreaterThan(0);
    for (const topico of topicos) {
      naoVazouCaminho(topico.author?.avatarUrl, "listTopicsOfCommunity");
    }
  });

  it("a pessoa na busca", async () => {
    const { lia } = await cenario();

    const pessoas = await buscarPessoas(viewerFor(lia.id), "Jo");

    expect(pessoas.length).toBeGreaterThan(0);
    for (const pessoa of pessoas) {
      naoVazouCaminho(pessoa.avatarUrl, "buscarPessoas");
    }
  });

  it("a lista de quem eu sigo", async () => {
    const { lia, jo } = await cenario();
    await followProfile(viewerFor(lia.id), jo.id);

    const seguindo = await getFollowing(viewerFor(lia.id), lia.id);

    expect(seguindo.length).toBe(1);
    naoVazouCaminho(seguindo[0]?.followedProfile?.avatarUrl, "getFollowing");
  });

  it("o perfil, pelos dois caminhos que o leem", async () => {
    const { lia, jo } = await cenario();

    const pelaTela = await perfilNaTela(viewerFor(lia.id), "jofoto");
    naoVazouCaminho(pelaTela.avatarUrl, "perfilNaTela");

    const peloOutro = await getProfileForViewer(viewerFor(lia.id), "jofoto");
    naoVazouCaminho(peloOutro.avatarUrl, "getProfileForViewer");
    void jo;
  });
});
