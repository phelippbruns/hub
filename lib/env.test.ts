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
