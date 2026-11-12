import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { asViewer, db, makeProfile, resetDatabase } from "./testing/db";

/**
 * As regras do Blog e do Status **no banco** (Bloco 1).
 *
 * Por que aqui e não em teste de unidade: índice único parcial, gatilho e
 * RLS não existem em dublê. E as três regras desta rodada são todas do tipo
 * que só o banco garante quando duas requisições chegam juntas — a
 * conferência no app dá a mensagem boa, o banco é quem segura a corrida.
 */

const corpo = { type: "doc", content: [] };

async function criarPost(authorId: string, title: string, extras: object = {}) {
  return db.post.create({ data: { authorId, title, body: corpo, ...extras } });
}

beforeEach(resetDatabase);
afterAll(() => db.$disconnect());

describe("RN39: até 3 posts fixados por pessoa", () => {
  it("RN39: o gatilho recusa o quarto fixado", async () => {
    const pessoa = await makeProfile();
    for (const titulo of ["Um", "Dois", "Três"]) {
      await criarPost(pessoa.id, titulo, { pinnedAt: new Date() });
    }

    await expect(criarPost(pessoa.id, "Quatro", { pinnedAt: new Date() })).rejects.toThrow(/RN39/);
  });

  it("RN39: fixar o quarto por UPDATE também é recusado", async () => {
    const pessoa = await makeProfile();
    for (const titulo of ["Um", "Dois", "Três"]) {
      await criarPost(pessoa.id, titulo, { pinnedAt: new Date() });
    }
    const quarto = await criarPost(pessoa.id, "Quatro");

    await expect(
      db.post.update({ where: { id: quarto.id }, data: { pinnedAt: new Date() } }),
    ).rejects.toThrow(/RN39/);
  });

  it("RN39: post apagado não ocupa vaga de fixado", async () => {
    const pessoa = await makeProfile();
    for (const titulo of ["Um", "Dois"]) {
      await criarPost(pessoa.id, titulo, { pinnedAt: new Date() });
    }
    await criarPost(pessoa.id, "Apagado", { pinnedAt: new Date(), deletedAt: new Date() });

    // O terceiro vivo entra: o apagado não conta.
    await expect(criarPost(pessoa.id, "Três", { pinnedAt: new Date() })).resolves.toBeDefined();
  });

  it("RN39: o limite é por pessoa, não do Hub", async () => {
    const [uma, outra] = [await makeProfile(), await makeProfile()];
    for (const titulo of ["Um", "Dois", "Três"]) {
      await criarPost(uma.id, titulo, { pinnedAt: new Date() });
    }

    await expect(criarPost(outra.id, "Meu", { pinnedAt: new Date() })).resolves.toBeDefined();
  });
});

describe("o endereço do post sai do título", () => {
  it("dois posts com o mesmo título ganham endereços diferentes", async () => {
    const pessoa = await makeProfile();

    const um = await criarPost(pessoa.id, "Uma noite no galpão");
    const dois = await criarPost(pessoa.id, "Uma noite no galpão");

    expect(um.slug).toBe("uma-noite-no-galpao");
    expect(dois.slug).toBe("uma-noite-no-galpao-2");
  });

  it("o mesmo endereço pode existir em duas pessoas", async () => {
    const [uma, outra] = [await makeProfile(), await makeProfile()];

    const dela = await criarPost(uma.id, "Teoria do set");
    const dele = await criarPost(outra.id, "Teoria do set");

    // O endereço é /<handle>/<slug>: a unicidade é por autor, não pelo Hub.
    expect(dela.slug).toBe("teoria-do-set");
    expect(dele.slug).toBe("teoria-do-set");
  });

  it("título só de símbolos ainda ganha endereço", async () => {
    const pessoa = await makeProfile();

    const post = await criarPost(pessoa.id, "!!! ???");

    expect(post.slug).toBe("post");
  });

  it("mudar o título muda o endereço; editar o corpo não", async () => {
    const pessoa = await makeProfile();
    const post = await criarPost(pessoa.id, "Antes");

    const mesmoTitulo = await db.post.update({
      where: { id: post.id },
      data: { excerpt: "mexi só no corpo" },
    });
    expect(mesmoTitulo.slug).toBe("antes");

    const outroTitulo = await db.post.update({
      where: { id: post.id },
      data: { title: "Depois" },
    });
    expect(outroTitulo.slug).toBe("depois");
  });
});

describe("RN40: um status por vez, e o histórico guarda 8", () => {
  it("RN40: duas linhas sem fim para a mesma pessoa é recusado pelo banco", async () => {
    const pessoa = await makeProfile();
    await db.profileStatus.create({
      data: { profileId: pessoa.id, kind: "listening", text: "Cascade" },
    });

    await expect(
      db.profileStatus.create({
        data: { profileId: pessoa.id, kind: "reading", text: "Torto Arado" },
      }),
    ).rejects.toThrow(/profile_statuses_atual/);
  });

  it("RN40: duas pessoas têm, cada uma, o seu status de agora", async () => {
    const [uma, outra] = [await makeProfile(), await makeProfile()];
    await db.profileStatus.create({ data: { profileId: uma.id, kind: "custom", text: "Férias" } });

    await expect(
      db.profileStatus.create({ data: { profileId: outra.id, kind: "custom", text: "Férias" } }),
    ).resolves.toBeDefined();
  });

  it("RN40: encerrar o anterior libera a vaga", async () => {
    const pessoa = await makeProfile();
    const antigo = await db.profileStatus.create({
      data: { profileId: pessoa.id, kind: "listening", text: "Cascade" },
    });

    await db.profileStatus.update({ where: { id: antigo.id }, data: { endedAt: new Date() } });

    await expect(
      db.profileStatus.create({ data: { profileId: pessoa.id, kind: "working", text: "No Hub" } }),
    ).resolves.toBeDefined();
  });

  it("RN40: depois de 12 trocas, o histórico tem 8", async () => {
    const pessoa = await makeProfile();

    for (let i = 1; i <= 12; i++) {
      const atual = await db.profileStatus.create({
        data: { profileId: pessoa.id, kind: "custom", text: `Status ${i}` },
      });
      await db.profileStatus.update({
        where: { id: atual.id },
        // `ended_at` crescente, senão a poda não tem como ordenar.
        data: { endedAt: new Date(Date.now() + i * 1000) },
      });
    }

    const encerrados = await db.profileStatus.findMany({
      where: { profileId: pessoa.id, endedAt: { not: null } },
      orderBy: { endedAt: "desc" },
    });

    expect(encerrados).toHaveLength(8);
    // E são os 8 **últimos**, não os 8 primeiros.
    expect(encerrados[0]!.text).toBe("Status 12");
    expect(encerrados[7]!.text).toBe("Status 5");
  });

  it("RN40: a poda é por pessoa", async () => {
    const [uma, outra] = [await makeProfile(), await makeProfile()];
    const dela = await db.profileStatus.create({
      data: { profileId: uma.id, kind: "custom", text: "Dela" },
    });
    await db.profileStatus.update({ where: { id: dela.id }, data: { endedAt: new Date() } });

    for (let i = 1; i <= 10; i++) {
      const atual = await db.profileStatus.create({
        data: { profileId: outra.id, kind: "custom", text: `Dele ${i}` },
      });
      await db.profileStatus.update({
        where: { id: atual.id },
        data: { endedAt: new Date(Date.now() + i * 1000) },
      });
    }

    const sobrou = await db.profileStatus.count({ where: { profileId: uma.id } });
    expect(sobrou).toBe(1);
  });
});

describe("o RLS é a segunda barreira (regra de segurança 2)", () => {
  /**
   * O Prisma conecta como dono e ignora o RLS, então estes testes usam uma
   * conexão com papel comum. É a mesma receita de `privacidade.db.test.ts`.
   */
  it("post público aparece para visitante sem conta", async () => {
    const pessoa = await makeProfile();
    await criarPost(pessoa.id, "Público");

    const linhas = await asViewer(null, async (cliente) =>
      cliente.query(`SELECT title FROM posts`),
    );

    expect(linhas.rows).toHaveLength(1);
  });

  it("post apagado não aparece para ninguém de fora", async () => {
    const pessoa = await makeProfile();
    const outra = await makeProfile();
    await criarPost(pessoa.id, "Apagado", { deletedAt: new Date() });

    const linhas = await asViewer(outra.id, async (cliente) =>
      cliente.query(`SELECT title FROM posts`),
    );

    expect(linhas.rows).toHaveLength(0);
  });

  it("post de Círculo não vaza, nem para quem tem sessão", async () => {
    const pessoa = await makeProfile();
    const outra = await makeProfile();
    await criarPost(pessoa.id, "Reservado", { audience: "circle" });

    const deFora = await asViewer(outra.id, async (cliente) =>
      cliente.query(`SELECT title FROM posts`),
    );
    const deQuemEscreveu = await asViewer(pessoa.id, async (cliente) =>
      cliente.query(`SELECT title FROM posts`),
    );

    expect(deFora.rows).toHaveLength(0);
    expect(deQuemEscreveu.rows).toHaveLength(1);
  });

  it("ninguém escreve post no nome de outra pessoa", async () => {
    const pessoa = await makeProfile();
    const outra = await makeProfile();

    await expect(
      asViewer(outra.id, async (cliente) =>
        cliente.query(
          `INSERT INTO posts (author_id, title, body) VALUES ($1::uuid, 'Forjado', '{}'::jsonb)`,
          [pessoa.id],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });

  it("ninguém apaga nem fixa post de outra pessoa", async () => {
    const pessoa = await makeProfile();
    const outra = await makeProfile();
    const post = await criarPost(pessoa.id, "Meu");

    const apagou = await asViewer(outra.id, async (cliente) =>
      cliente.query(`UPDATE posts SET deleted_at = now() WHERE id = $1::uuid`, [post.id]),
    );

    // Sem erro: o RLS esconde a linha, então o UPDATE não acha o que mudar.
    expect(apagou.rowCount).toBe(0);
  });

  it("o status é público, e só a própria pessoa escreve o dela", async () => {
    const pessoa = await makeProfile();
    const outra = await makeProfile();
    await db.profileStatus.create({
      data: { profileId: pessoa.id, kind: "listening", text: "Cascade" },
    });

    const lido = await asViewer(outra.id, async (cliente) =>
      cliente.query(`SELECT text FROM profile_statuses`),
    );
    expect(lido.rows).toHaveLength(1);

    await expect(
      asViewer(outra.id, async (cliente) =>
        cliente.query(
          `INSERT INTO profile_statuses (profile_id, kind, text)
           VALUES ($1::uuid, 'custom', 'forjado')`,
          [pessoa.id],
        ),
      ),
    ).rejects.toThrow(/row-level security/i);
  });
});
