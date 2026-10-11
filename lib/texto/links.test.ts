import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { DOMINIOS_RECONHECIDOS, acharLink, contemLink } from "./links";

/**
 * RN16, nas duas direções.
 *
 * Deixar um link passar é o que a regra proíbe. Mas recusar "R$ 3.50" é pior
 * na prática: a pessoa não fez nada errado e não tem como adivinhar o que o
 * Hub não gostou. Por isso metade destes casos é do que **não** é link.
 */
describe("RN16: o que é endereço", () => {
  it.each([
    ["https://exemplo.com", "com esquema"],
    ["http://exemplo.com/caminho?x=1", "com caminho e parâmetros"],
    ["entra em HTTPS://EXEMPLO.COM agora", "em maiúsculas"],
    ["javascript:alert(1)", "esquema perigoso"],
    ["meusite.com", "domínio nu"],
    ["www.exemplo.com", "começando com www"],
    ["olha o meusite.com.br aí", "domínio composto"],
    ["me chama em fulano@exemplo.com", "email"],
    ["meusite ponto com", "escrito por extenso"],
    ["MEUSITE PONTO COM", "por extenso em maiúsculas"],
    ["meusite  ponto  com", "por extenso com espaço sobrando"],
    ["meusite ponto com ponto br", "por extenso e composto"],
    ["segue lá: insta.gg/fulano", "com barra depois"],
    ["acesse exemplo.io para ver", "no meio da frase"],
    ["oi\nmeusite.com\ntchau", "em outra linha"],
  ])("acha em %s (%s)", (texto) => {
    expect(contemLink(texto)).toBe(true);
  });

  it.each([
    ["etc.pode ser que sim", "palavra com ponto que não é domínio"],
    ["custou R$ 3.50 no sebo", "número com ponto"],
    ["falei com o Dr. Oliveira ontem", "abreviação"],
    ["corri 3.5 km hoje", "medida"],
    ["o ponto de ônibus fica ali", "a palavra ponto sozinha"],
    ["chega no ponto com calma", "ponto seguido de 'com' como preposição"],
    ["fim.", "ponto final"],
    ["não sei... talvez", "reticências"],
    ["li 1984.foi marcante", "ponto sem espaço entre frases"],
    ["o @joramos respondeu", "um @ do Hub, que não é email"],
  ])("não acha em %s (%s)", (texto) => {
    expect(contemLink(texto)).toBe(false);
  });
});

describe("o que esta detecção não pega, de propósito", () => {
  /*
   * Registrado como teste para ser uma escolha, e não uma surpresa: se
   * alguém apertar a regra depois, este teste falha e a pessoa decide se
   * quer o aperto, em vez de descobrir o falso positivo em produção.
   */
  it("endereço por extenso no meio da frase escapa", () => {
    expect(contemLink("visita meusite ponto com hoje")).toBe(false);
  });

  it("e o motivo é não recusar português normal", () => {
    expect(contemLink("nesse ponto com certeza você tem razão")).toBe(false);
    expect(contemLink("chegamos a um ponto com muita gente")).toBe(false);
  });
});

describe("apontar o trecho", () => {
  it("devolve o endereço exato, para o aviso poder citá-lo", () => {
    const achado = acharLink("fui no meusite.com ontem");

    expect(achado?.trecho).toBe("meusite.com");
    expect(achado?.inicio).toBe(7);
    expect(achado?.fim).toBe(18);
  });

  it("o trecho recortado pelos índices é o próprio endereço", () => {
    const texto = "olha isso: www.exemplo.com, vale a pena";
    const achado = acharLink(texto)!;

    expect(texto.slice(achado.inicio, achado.fim)).toBe(achado.trecho);
  });

  it("com dois endereços, aponta o primeiro", () => {
    // É o que a pessoa vai procurar primeiro ao corrigir.
    const achado = acharLink("meusite.com e também outro.org");
    expect(achado?.trecho).toBe("meusite.com");
  });

  it("texto limpo não devolve nada", () => {
    expect(acharLink("uma resposta honesta, sem endereço nenhum")).toBeNull();
  });

  it("aguenta texto longo sem travar", () => {
    /*
     * As expressões não têm quantificador aninhado de propósito. Com um,
     * uma string longa sem casamento retrocede em tempo quadrático — e isto
     * roda a cada tecla digitada.
     */
    const longo = `${"a".repeat(50_000)} fim`;

    const comeco = Date.now();
    expect(contemLink(longo)).toBe(false);
    expect(Date.now() - comeco).toBeLessThan(500);
  });
});

describe("as listas de domínios não divergem", () => {
  /*
   * A lista aparece escrita dentro de cada expressão, porque montá-las com
   * texto interpolado faz o lint de segurança apitar — e com razão, já que é
   * por aí que entra expressão vinda de fora.
   *
   * O preço da duplicação é a chance de alguém acrescentar um domínio em um
   * lugar e esquecer o outro. Este teste é o que cobra o preço na hora.
   */
  const fonte = readFileSync(new URL("./links.ts", import.meta.url), "utf8");
  const expressoes = fonte.split("\n").filter((linha) => linha.includes("expressao:"));

  it.each([...DOMINIOS_RECONHECIDOS])("o domínio %s é reconhecido de verdade", (dominio) => {
    expect(contemLink(`exemplo.${dominio}`)).toBe(true);
  });

  it("toda expressão com lista de domínios tem a lista inteira", () => {
    // Cada `(?:com|br|net|…)` escrito nas expressões.
    // Sem repetição aninhada: o conteúdo é capturado inteiro e separado
    // depois, em vez de a expressão contar os itens.
    const grupos = [...fonte.matchAll(/\(\?:([a-z|]{30,})\)/g)];
    expect(grupos.length, "não achei as listas dentro das expressões").toBeGreaterThan(0);

    const esperado = [...DOMINIOS_RECONHECIDOS].sort();
    for (const grupo of grupos) {
      expect(grupo[1]!.split("|").sort()).toEqual(esperado);
    }
  });

  it("encontra as expressões no arquivo, e não passa por vazio", () => {
    // Se o arquivo for reescrito e o teste parar de achar nada, ele avisa.
    expect(expressoes.length).toBeGreaterThanOrEqual(4);
  });
});
