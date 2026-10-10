import { describe, expect, it } from "vitest";
import { haQuantoTempo } from "./tempo";

const agora = new Date("2026-10-10T12:00:00Z");
const atras = (ms: number) => new Date(agora.getTime() - ms);

const minuto = 60_000;
const hora = 60 * minuto;
const dia = 24 * hora;

describe("há quanto tempo", () => {
  it.each([
    [atras(10_000), "agora"],
    [atras(minuto), "há 1 min"],
    [atras(5 * minuto), "há 5 min"],
    [atras(59 * minuto), "há 59 min"],
    [atras(hora), "há 1 h"],
    [atras(23 * hora), "há 23 h"],
    [atras(dia), "há 1 dia"],
    [atras(2 * dia), "há 2 dias"],
    [atras(7 * dia), "há 1 semana"],
    [atras(14 * dia), "há 2 semanas"],
    [atras(30 * dia), "há 1 mês"],
    [atras(60 * dia), "há 2 meses"],
    [atras(400 * dia), "há 1 ano"],
  ])("%s vira %s", (quando, esperado) => {
    expect(haQuantoTempo(quando, agora)).toBe(esperado);
  });

  it("data no futuro não vira texto negativo", async () => {
    // Relógio do servidor adiantado em relação ao do banco já aconteceu.
    expect(haQuantoTempo(new Date(agora.getTime() + 5 * minuto), agora)).toBe("agora");
  });

  it('o plural de "mês" é "meses", não "mêss"', () => {
    expect(haQuantoTempo(atras(90 * dia), agora)).toBe("há 3 meses");
  });
});
