import { describe, expect, it } from "vitest";
import { DEFAULT_DESTINATION, safeDestination } from "./redirect";

/**
 * Item 9 da F03: o retorno do Google é validado contra uma lista de destinos
 * permitidos, para evitar redirecionamento aberto — o jeito clássico de roubar
 * sessão num fluxo de OAuth.
 */
describe("destino do retorno", () => {
  it.each([
    ["caminho interno", "/comunidades", "/comunidades"],
    ["com parâmetros", "/topico/1?ordem=recente", "/topico/1?ordem=recente"],
  ])("aceita %s", (_caso, next, expected) => {
    expect(safeDestination(next)).toBe(expected);
  });

  it.each([
    ["URL absoluta", "https://site-falso.com"],
    ["sem esquema", "//site-falso.com"],
    ["barra invertida", "/\\site-falso.com"],
    ["javascript", "javascript:alert(1)"],
    ["javascript com barra", "/\tjavascript:alert(1)"],
    ["dados", "data:text/html,<script>"],
    ["vazio", ""],
    ["nulo", null],
    ["indefinido", undefined],
  ])("descarta %s", (_caso, next) => {
    expect(safeDestination(next)).toBe(DEFAULT_DESTINATION);
  });

  it("respeita o destino de reserva informado", () => {
    expect(safeDestination("https://site-falso.com", "/entrar")).toBe("/entrar");
  });
});
