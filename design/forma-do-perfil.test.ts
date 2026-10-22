import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CLASSE_DA_FORMA, FORMA_DO_PERFIL } from "./forma-do-perfil";

/**
 * O contorno da foto de perfil existe em dois lugares porque são dois usos
 * diferentes: a máscara que recorta a imagem, em CSS, e o traço desenhado
 * por cima do quadro de ajuste, em SVG. CSS não importa constante de
 * TypeScript, então a string é repetida.
 *
 * Duas cópias da mesma coisa é como uma é corrigida sem a outra, e o
 * sintoma seria dos piores: a foto recortada numa forma e o traço do ajuste
 * noutra, deslocados por alguns pixels, sem erro em lugar nenhum. Este
 * teste é a única coisa que impede isso.
 */
describe("a forma da foto de perfil é uma só", () => {
  const css = readFileSync("app/globals.css", "utf8");

  it("a classe existe no CSS", () => {
    expect(css).toContain(`.${CLASSE_DA_FORMA} {`);
  });

  it("a máscara do CSS desenha o mesmo contorno da constante", () => {
    const uri = css.match(/mask: url\("(data:image\/svg\+xml,[^"]+)"\)/)?.[1];
    expect(uri, "não achei a máscara em app/globals.css").toBeDefined();

    const caminho = decodeURIComponent(uri!).match(/<path d='([^']+)'\/>/)?.[1];
    expect(caminho, "a máscara não tem um <path d='…'>").toBeDefined();
    expect(caminho).toBe(FORMA_DO_PERFIL);
  });

  it("a versão com prefixo do webkit é igual à sem", () => {
    const comPrefixo = css.match(/-webkit-mask: url\("([^"]+)"\)/)?.[1];
    const sem = css.match(/\n {2}mask: url\("([^"]+)"\)/)?.[1];
    expect(comPrefixo).toBe(sem);
  });

  /*
   * Coordenadas de 0 a 1: é o que faz a mesma forma servir ao avatar de
   * 30 px e ao de 100 px. Um número fora da faixa passaria despercebido na
   * tela grande e cortaria a foto na pequena.
   */
  it("fica toda dentro da caixa de 0 a 1", () => {
    const numeros = FORMA_DO_PERFIL.match(/[\d.]+/g)!.map(Number);
    expect(numeros.length).toBeGreaterThan(300);
    for (const n of numeros) {
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThanOrEqual(1);
    }
  });

  it("é um caminho fechado", () => {
    expect(FORMA_DO_PERFIL.startsWith("M")).toBe(true);
    expect(FORMA_DO_PERFIL.endsWith("Z")).toBe(true);
  });
});
