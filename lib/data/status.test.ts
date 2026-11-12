import { describe, expect, it } from "vitest";
import { definirStatusSchema } from "./validation";
import { TIPOS_DE_STATUS, limiteDoStatus } from "@/lib/status";

/**
 * RN40: os limites do status, conferidos **no servidor**.
 *
 * A tela mostra um contador, e o contador é conveniência. Este arquivo é a
 * regra: um formulário forjado chega direto na Server Action, e é aqui que
 * ele para.
 */

const valido = (tipo: string, texto: string) =>
  definirStatusSchema.safeParse({ tipo, texto }).success;

describe("RN40: o limite depende do tipo", () => {
  it.each(["listening", "reading", "watching", "working"] as const)(
    "RN40: %s aceita 40 e recusa 41",
    (tipo) => {
      expect(valido(tipo, "a".repeat(40))).toBe(true);
      expect(valido(tipo, "a".repeat(41))).toBe(false);
    },
  );

  it("RN40: personalizado aceita 60 e recusa 61", () => {
    expect(valido("custom", "a".repeat(60))).toBe(true);
    expect(valido("custom", "a".repeat(61))).toBe(false);
  });

  /**
   * A armadilha que o `superRefine` existe para evitar: um `max(60)` solto
   * no campo deixaria 60 caracteres passarem em "Ouvindo", e a pílula —
   * que ainda põe o prefixo — estouraria a linha no perfil de todo mundo.
   */
  it("RN40: 60 caracteres num tipo com prefixo é recusado", () => {
    expect(valido("custom", "a".repeat(60))).toBe(true);
    expect(valido("listening", "a".repeat(60))).toBe(false);
  });

  it("o limite que a tela mostra é o mesmo que o servidor confere", () => {
    for (const tipo of TIPOS_DE_STATUS) {
      const limite = limiteDoStatus(tipo);
      expect(valido(tipo, "a".repeat(limite))).toBe(true);
      expect(valido(tipo, "a".repeat(limite + 1))).toBe(false);
    }
  });
});

describe("RN40: o que não é status", () => {
  it("texto em branco é recusado", () => {
    expect(valido("custom", "")).toBe(false);
    expect(valido("custom", "   ")).toBe(false);
  });

  it("tipo inventado é recusado", () => {
    expect(valido("dancando", "forró")).toBe(false);
  });

  it("RN16: link no status é recusado", () => {
    expect(valido("custom", "ouve em https://exemplo.com")).toBe(false);
    expect(valido("custom", "ouve em exemplo.com/faixa")).toBe(false);
  });

  it("o espaço das pontas sai antes de medir", () => {
    const comEspaco = `  ${"a".repeat(40)}  `;
    expect(valido("listening", comEspaco)).toBe(true);
  });
});
