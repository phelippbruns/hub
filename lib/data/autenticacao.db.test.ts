/**
 * Cadastro e limite de tentativas, contra o banco de verdade.
 *
 * O que se prova aqui é o que a tela não garante: que as regras valem no
 * servidor, mesmo que alguém envie o formulário por fora.
 */
import { beforeEach, describe, expect, it } from "vitest";
import { db, makeProfile, resetDatabase } from "./testing/db";
import { createProfile, suggestAvailableHandle } from "./profiles";
import {
  clearAttempts,
  isRateLimited,
  recordAttempt,
  remainingAttempts,
  hashKey,
} from "./auth-attempts";
import { ForbiddenError } from "./errors";

beforeEach(resetDatabase);

/** Cria o usuário do Auth, como o Supabase faria no signUp. */
async function makeAuthUser(email: string): Promise<string> {
  const id = crypto.randomUUID();
  await db.$executeRawUnsafe(
    `INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password,
                             email_confirmed_at, created_at, updated_at)
     VALUES ($1::uuid, '00000000-0000-0000-0000-000000000000', 'authenticated',
             'authenticated', $2, '', now(), now(), now())`,
    id,
    email,
  );
  return id;
}

describe("RN29: cadastro exige verificação de idade e aceite dos Termos", () => {
  it("cria o perfil quando os dois estão presentes", async () => {
    const authId = await makeAuthUser("ana@teste.hub");
    const profile = await createProfile({
      authUserId: authId,
      name: "Ana Lima",
      ageVerifiedAt: new Date(),
      termsVersion: "2026-10-01",
    });

    expect(profile.handle).toBe("analima");
    expect(profile.ageVerifiedAt).not.toBeNull();
    expect(profile.termsVersion).toBe("2026-10-01");
  });

  it("recusa sem verificação de idade", async () => {
    const authId = await makeAuthUser("sem-idade@teste.hub");
    await expect(
      createProfile({
        authUserId: authId,
        name: "Ana Lima",
        ageVerifiedAt: undefined as unknown as Date,
        termsVersion: "2026-10-01",
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(await db.profile.count()).toBe(0);
  });

  it("recusa sem aceite dos Termos", async () => {
    const authId = await makeAuthUser("sem-termos@teste.hub");
    await expect(
      createProfile({
        authUserId: authId,
        name: "Ana Lima",
        ageVerifiedAt: new Date(),
        termsVersion: "",
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(await db.profile.count()).toBe(0);
  });
});

describe("RN17: o @ é único", () => {
  it("duas pessoas com o mesmo nome recebem @ diferentes", async () => {
    const primeiraId = await makeAuthUser("ana1@teste.hub");
    const segundaId = await makeAuthUser("ana2@teste.hub");

    const primeira = await createProfile({
      authUserId: primeiraId,
      name: "Ana Lima",
      ageVerifiedAt: new Date(),
      termsVersion: "v1",
    });
    const segunda = await createProfile({
      authUserId: segundaId,
      name: "Ana Lima",
      ageVerifiedAt: new Date(),
      termsVersion: "v1",
    });

    expect(primeira.handle).toBe("analima");
    expect(segunda.handle).toBe("analima2");
    expect(primeira.handle).not.toBe(segunda.handle);
  });

  it("a sugestão pula os @ já tomados", async () => {
    await makeProfile({ handle: "analima" });
    expect(await suggestAvailableHandle("Ana Lima")).toBe("analima2");
  });

  it("o banco recusa um @ repetido, mesmo se a checagem prévia falhar", async () => {
    await makeProfile({ handle: "analima" });
    const outroId = await makeAuthUser("outra@teste.hub");

    await expect(
      db.profile.create({
        data: { id: outroId, handle: "analima", name: "Outra Ana" },
      }),
    ).rejects.toThrow();
  });
});

describe("limite de tentativas", () => {
  it("o email nunca é gravado em claro", async () => {
    await recordAttempt("login", "ana@email.com", false);

    const linhas = await db.authAttempt.findMany();
    expect(linhas).toHaveLength(1);
    expect(linhas[0]!.keyHash).not.toContain("ana@email.com");
    expect(linhas[0]!.keyHash).toBe(hashKey("ana@email.com"));
  });

  it("ignora maiúsculas e espaços na chave", () => {
    expect(hashKey("  Ana@Email.com ")).toBe(hashKey("ana@email.com"));
  });

  it("bloqueia depois de esgotar as tentativas de login", async () => {
    const email = "forca-bruta@teste.hub";
    expect(await isRateLimited("login", email)).toBe(false);

    for (let i = 0; i < 10; i += 1) {
      await recordAttempt("login", email, false);
    }

    expect(await remainingAttempts("login", email)).toBe(0);
    expect(await isRateLimited("login", email)).toBe(true);
  });

  it("tentativa bem-sucedida não conta contra a pessoa", async () => {
    const email = "acertou@teste.hub";
    for (let i = 0; i < 10; i += 1) {
      await recordAttempt("login", email, true);
    }
    expect(await isRateLimited("login", email)).toBe(false);
  });

  it("entrar com sucesso zera o contador", async () => {
    const email = "zerou@teste.hub";
    for (let i = 0; i < 10; i += 1) await recordAttempt("login", email, false);
    expect(await isRateLimited("login", email)).toBe(true);

    await clearAttempts("login", email);
    expect(await isRateLimited("login", email)).toBe(false);
  });

  it("o limite de cadastro é separado do de login", async () => {
    const email = "separado@teste.hub";
    for (let i = 0; i < 10; i += 1) await recordAttempt("login", email, false);

    expect(await isRateLimited("login", email)).toBe(true);
    expect(await isRateLimited("signup", email)).toBe(false);
  });

  it("tentativa fora da janela não conta mais", async () => {
    const email = "antiga@teste.hub";
    const duasHorasAtras = new Date(Date.now() - 2 * 60 * 60 * 1000);

    for (let i = 0; i < 10; i += 1) {
      await db.authAttempt.create({
        data: { action: "login", keyHash: hashKey(email), createdAt: duasHorasAtras },
      });
    }

    // A janela do login é de 15 minutos.
    expect(await isRateLimited("login", email)).toBe(false);
  });
});

describe("as tentativas não vazam pelo navegador", () => {
  it("o RLS nega leitura da tabela", async () => {
    await recordAttempt("login", "alguem@teste.hub", false);

    const { asViewer } = await import("./testing/db");
    const pessoa = await makeProfile();
    const rows = await asViewer(pessoa.id, (client) => client.query("SELECT * FROM auth_attempts"));

    expect(rows.rows).toHaveLength(0);
  });
});
