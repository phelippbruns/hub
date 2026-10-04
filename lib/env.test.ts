import { describe, expect, it } from "vitest";
import { parseClientEnv, parseServerEnv } from "./env";

const serverOk = {
  DATABASE_URL: "postgresql://user:pass@localhost:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://user:pass@localhost:5432/postgres",
  SUPABASE_SECRET_KEY: "service-role-key",
  NODE_ENV: "test",
};

describe("parseServerEnv", () => {
  it("aceita um ambiente completo", () => {
    expect(parseServerEnv(serverOk).DATABASE_URL).toBe(serverOk.DATABASE_URL);
  });

  it("falha nomeando a variável que falta", () => {
    const semBanco: Record<string, string | undefined> = { ...serverOk };
    delete semBanco.DATABASE_URL;
    expect(() => parseServerEnv(semBanco)).toThrow(/DATABASE_URL/);
  });

  it("recusa URL de banco que não é Postgres", () => {
    expect(() => parseServerEnv({ ...serverOk, DIRECT_URL: "https://exemplo.test" })).toThrow(
      /DIRECT_URL/,
    );
  });
});

describe("parseClientEnv", () => {
  it("falha sem a chave anônima", () => {
    expect(() => parseClientEnv({ NEXT_PUBLIC_SUPABASE_URL: "https://x.supabase.co" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });
});

describe("RN29: a trava do verificador de idade falso", () => {
  const clienteLocal = {
    NEXT_PUBLIC_SUPABASE_URL: "http://127.0.0.1:54321",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave",
  };
  const clienteRemoto = {
    NEXT_PUBLIC_SUPABASE_URL: "https://projeto.supabase.co",
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "chave",
  };

  it("aceita AGE_VERIFIER=fake com Supabase local", () => {
    expect(parseServerEnv({ ...serverOk, AGE_VERIFIER: "fake" }).AGE_VERIFIER).toBe("fake");
    expect(parseClientEnv(clienteLocal).NEXT_PUBLIC_SUPABASE_URL).toContain("127.0.0.1");
  });

  it("só aceita 'fake' como valor", () => {
    expect(() => parseServerEnv({ ...serverOk, AGE_VERIFIER: "sim" })).toThrow(/AGE_VERIFIER/);
  });

  it("a variável é opcional, e ausente significa negar", () => {
    expect(parseServerEnv(serverOk).AGE_VERIFIER).toBeUndefined();
  });

  it("reconhece quando o Supabase não é local", () => {
    const url = parseClientEnv(clienteRemoto).NEXT_PUBLIC_SUPABASE_URL;
    expect(/localhost|127\.0\.0\.1/.test(url)).toBe(false);
  });
});
