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

/** Alguém com 30 anos, para os casos em que a idade não é o assunto. */
const NASCIMENTO_ADULTO = new Date(Date.UTC(new Date().getUTCFullYear() - 30, 0, 15));

/** Campos de cadastro que não variam entre os testes. */
const CADASTRO_BASE = {
  birthDate: NASCIMENTO_ADULTO,
  ageVerifiedAt: new Date(),
  ageVerificationMethod: "self_declared",
  termsVersion: "2026-10-01",
} as const;

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
    const profile = await createProfile({ ...CADASTRO_BASE, authUserId: authId, name: "Ana Lima" });

    expect(profile.handle).toBe("analima");
    expect(profile.termsVersion).toBe("2026-10-01");

    // Os três campos da verificação andam juntos: com eles dá para achar
    // depois quem passou só pela data declarada.
    expect(profile.ageVerifiedAt).not.toBeNull();
    expect(profile.ageVerificationStatus).toBe("verified");
    expect(profile.ageVerificationMethod).toBe("self_declared");
    expect(profile.birthDate?.toISOString().slice(0, 10)).toBe(
      NASCIMENTO_ADULTO.toISOString().slice(0, 10),
    );
  });

  it("recusa sem verificação de idade", async () => {
    const authId = await makeAuthUser("sem-idade@teste.hub");
    await expect(
      createProfile({
        ...CADASTRO_BASE,
        authUserId: authId,
        name: "Ana Lima",
        ageVerifiedAt: undefined as unknown as Date,
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(await db.profile.count()).toBe(0);
  });

  it("recusa sem data de nascimento", async () => {
    const authId = await makeAuthUser("sem-data@teste.hub");
    await expect(
      createProfile({
        ...CADASTRO_BASE,
        authUserId: authId,
        name: "Ana Lima",
        birthDate: undefined as unknown as Date,
      }),
    ).rejects.toThrow(ForbiddenError);

    expect(await db.profile.count()).toBe(0);
  });

  it("recusa sem aceite dos Termos", async () => {
    const authId = await makeAuthUser("sem-termos@teste.hub");
    await expect(
      createProfile({ ...CADASTRO_BASE, authUserId: authId, name: "Ana Lima", termsVersion: "" }),
    ).rejects.toThrow(ForbiddenError);

    expect(await db.profile.count()).toBe(0);
  });
});

describe("RN17: o @ é único", () => {
  it("duas pessoas com o mesmo nome recebem @ diferentes", async () => {
    const primeiraId = await makeAuthUser("ana1@teste.hub");
    const segundaId = await makeAuthUser("ana2@teste.hub");

    const primeira = await createProfile({
      ...CADASTRO_BASE,
      authUserId: primeiraId,
      name: "Ana Lima",
    });
    const segunda = await createProfile({
      ...CADASTRO_BASE,
      authUserId: segundaId,
      name: "Ana Lima",
    });

    expect(primeira.handle).toBe("analima");
    expect(segunda.handle).toBe("analima2");
    expect(primeira.handle).not.toBe(segunda.handle);
  });

  it("respeita o @ escolhido pela pessoa", async () => {
    const authId = await makeAuthUser("escolhido@teste.hub");
    const perfil = await createProfile({
      ...CADASTRO_BASE,
      authUserId: authId,
      name: "Phelipp Bruns",
      handle: "phebruns",
    });

    // Sem escolha, o @ viria do nome ("phelippbruns").
    expect(perfil.handle).toBe("phebruns");
  });

  it("não troca em silêncio um @ escolhido que já existe", async () => {
    await makeProfile({ handle: "phebruns" });
    const authId = await makeAuthUser("colide@teste.hub");

    // Escolher um @ tomado precisa falhar, não virar "phebruns2" sem avisar.
    await expect(
      createProfile({
        ...CADASTRO_BASE,
        authUserId: authId,
        name: "Outra Pessoa",
        handle: "phebruns",
      }),
    ).rejects.toThrow();
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
