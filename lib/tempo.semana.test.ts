import { describe, expect, it } from "vitest";
import { FUSO_DO_CICLO, domingoMaisRecente } from "./tempo";

/**
 * O corte de "Essa semana" na central de notificações.
 *
 * O domingo é calculado **no fuso do ciclo**, e não no do servidor. O
 * servidor roda em UTC: sem isso, a semana viraria às 21h de sábado para
 * quem está no Brasil, e a área zeraria com um dia de antecedência.
 */
describe("o domingo que abre a semana", () => {
  /** Como o instante aparece no relógio do fuso, para a asserção ser legível. */
  function noFuso(quando: Date, fuso = FUSO_DO_CICLO) {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: fuso,
      dateStyle: "short",
      timeStyle: "short",
    }).format(quando);
  }

  it("numa quarta, volta para o domingo anterior às 00h", () => {
    // Quarta, 5 de novembro de 2026, 14h em São Paulo (17h UTC).
    const domingo = domingoMaisRecente(new Date("2026-11-04T17:00:00Z"));
    expect(noFuso(domingo)).toBe("2026-11-01 00:00");
  });

  it("no próprio domingo de manhã, é o domingo de hoje", () => {
    const domingo = domingoMaisRecente(new Date("2026-11-01T13:00:00Z"));
    expect(noFuso(domingo)).toBe("2026-11-01 00:00");
  });

  it("no sábado à noite, ainda é o domingo passado", () => {
    // Sábado 23h em São Paulo é domingo 02h em UTC: é exatamente aqui que
    // um corte feito no fuso do servidor erraria por um dia inteiro.
    const domingo = domingoMaisRecente(new Date("2026-11-08T02:00:00Z"));
    expect(noFuso(domingo)).toBe("2026-11-01 00:00");
  });

  it("logo depois da virada do domingo, já é o domingo novo", () => {
    // Domingo 00h05 em São Paulo.
    const domingo = domingoMaisRecente(new Date("2026-11-08T03:05:00Z"));
    expect(noFuso(domingo)).toBe("2026-11-08 00:00");
  });

  it("atravessa a virada do mês e do ano sem tropeçar", () => {
    // Sexta, 1º de janeiro de 2027: o domingo anterior é 27 de dezembro.
    const domingo = domingoMaisRecente(new Date("2027-01-01T15:00:00Z"));
    expect(noFuso(domingo)).toBe("2026-12-27 00:00");
  });

  it("num fuso com horário de verão, a meia-noite continua meia-noite", () => {
    /*
     * O Brasil não tem mais horário de verão, mas a conta não é só do
     * Brasil — e um erro de uma hora num corte de meia-noite joga a semana
     * para sábado. Nova York vira o horário de verão em 8 de março de 2026.
     */
    const depois = domingoMaisRecente(new Date("2026-03-11T15:00:00Z"), "America/New_York");
    expect(noFuso(depois, "America/New_York")).toBe("2026-03-08 00:00");
  });
});
