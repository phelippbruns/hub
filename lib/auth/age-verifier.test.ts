import { describe, expect, it } from "vitest";
import {
  FakeAgeVerifier,
  MINIMUM_AGE,
  UnavailableAgeVerifier,
  ageOn,
  resolveAgeVerifier,
} from "./age-verifier";

function birthDateForAge(age: number): string {
  const now = new Date();
  const date = new Date(Date.UTC(now.getUTCFullYear() - age, now.getUTCMonth(), now.getUTCDate()));
  return date.toISOString().slice(0, 10);
}

describe("RN29: idade mínima de 16 anos", () => {
  const verifier = new FakeAgeVerifier();

  it("aprova quem tem exatamente a idade mínima", async () => {
    const result = await verifier.verify({
      reference: "x",
      declaredBirthDate: birthDateForAge(MINIMUM_AGE),
    });
    expect(result.status).toBe("verified");
  });

  it("recusa quem tem um ano a menos", async () => {
    const result = await verifier.verify({
      reference: "x",
      declaredBirthDate: birthDateForAge(MINIMUM_AGE - 1),
    });
    expect(result.status).toBe("rejected");
  });

  it.each([undefined, "", "não é data"])("recusa data ausente ou inválida (%s)", async (date) => {
    const result = await verifier.verify({ reference: "x", declaredBirthDate: date });
    expect(result.status).toBe("rejected");
  });
});

describe("cálculo de idade", () => {
  it("não conta o ano quando o aniversário ainda não chegou", () => {
    const birth = new Date(Date.UTC(2000, 11, 31));
    expect(ageOn(birth, new Date(Date.UTC(2026, 0, 1)))).toBe(25);
  });

  it("conta o ano no dia do aniversário", () => {
    const birth = new Date(Date.UTC(2000, 0, 1));
    expect(ageOn(birth, new Date(Date.UTC(2026, 0, 1)))).toBe(26);
  });
});

describe("escolha do verificador", () => {
  it("usa o falso só com AGE_VERIFIER=fake", () => {
    expect(resolveAgeVerifier("fake")).toBeInstanceOf(FakeAgeVerifier);
  });

  it.each([undefined, "", "producao", "qualquer-coisa"])(
    "nega quando a variável é %s",
    async (choice) => {
      const verifier = resolveAgeVerifier(choice);
      expect(verifier).toBeInstanceOf(UnavailableAgeVerifier);

      // Negar é o lado seguro: esquecer de configurar não pode virar cadastro
      // sem verificação de idade (RN29).
      const result = await verifier.verify({
        reference: "x",
        declaredBirthDate: birthDateForAge(30),
      });
      expect(result.status).toBe("rejected");
    },
  );
});
