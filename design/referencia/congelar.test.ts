import { describe, expect, it } from "vitest";
import {
  congelarHtml,
  problemasDoHtml,
  procedencia,
  reescreverImagens,
  type Molde,
} from "./congelar";

/**
 * **Testar a reescrita antes de pagar a captura.**
 *
 * O gerador das páginas de referência leva dez minutos e precisa de Docker,
 * banco e build. Descobrir um erro de reescrita na vigésima página custa a
 * rodada inteira; descobrir aqui custa dois segundos.
 */

const MOLDE: Molde = {
  css: "../ativos/app.css",
  tema: "../ativos/tema.js",
  ficha: "<details data-hub-ficha><summary>Ficha</summary></details>",
  procedencia: "<!-- retrato -->",
};

const PAGINA = `<!doctype html>
<html lang="pt-BR">
<head>
<link rel="preload" as="font" href="/_next/static/media/fonte.woff2" />
<link rel="stylesheet" href="/_next/static/chunks/abc.css" />
<link rel="stylesheet" href="/_next/static/chunks/def.css" />
<link rel="manifest" href="/manifest.webmanifest" />
<script nonce="xyz123" src="/_next/static/chunks/main.js"></script>
</head>
<body>
<img src="/_next/image?url=%2Ffoto.png&w=64" srcset="/_next/image?url=%2Ffoto.png&w=32 1x" sizes="32px" />
<p nonce="xyz123">oi</p>
<script nonce="xyz123">self.__next_f.push([1,"payload"])</script>
</body>
</html>`;

describe("congelar a página", () => {
  const saida = congelarHtml(PAGINA, MOLDE);

  it("tira todo script do Next", () => {
    expect(saida).not.toMatch(/__next_f/);
    expect(saida).not.toMatch(/main\.js/);
  });

  it("mantém o script do interruptor de tema", () => {
    /*
     * A primeira versão inseria o script do tema **antes** de remover os
     * scripts, e a remoção levava o meu junto: a página saía sem interruptor
     * e sem erro nenhum. Daí o `data-hub-tema` ser exceção explícita.
     */
    expect(saida).toContain('data-hub-tema src="../ativos/tema.js"');
    expect((saida.match(/<script/g) ?? []).length).toBe(1);
  });

  it("tira o nonce de tudo, não só dos scripts", () => {
    expect(saida).not.toMatch(/nonce=/);
    // E o elemento em volta sobrevive, sem espaço sobrando: o padrão come o
    // espaço antes do atributo, então `<p nonce="x">` volta a ser `<p>`.
    expect(saida).toContain("<p>oi</p>");
  });

  it("deixa uma folha de estilo só, no lugar da primeira", () => {
    const folhas = saida.match(/<link rel="stylesheet"[^>]*>/g) ?? [];
    expect(folhas).toHaveLength(1);
    expect(folhas[0]).toContain("../ativos/app.css");
  });

  it("tira preload, prefetch e o manifesto da PWA", () => {
    expect(saida).not.toMatch(/rel="preload"/);
    expect(saida).not.toMatch(/manifest/);
  });

  it("põe a procedência antes de tudo", () => {
    expect(saida.startsWith("<!-- retrato -->")).toBe(true);
  });

  it("põe a ficha dentro do body", () => {
    expect(saida).toContain("data-hub-ficha");
    expect(saida.indexOf("data-hub-ficha")).toBeLessThan(saida.indexOf("</body>"));
  });
});

describe("reescrever imagens", () => {
  it("troca a URL pelo arquivo local", () => {
    const html = '<img src="http://127.0.0.1:3000/_next/image?url=%2Ffoto.png&w=64" />';
    const saida = reescreverImagens(
      html,
      new Map([
        ["http://127.0.0.1:3000/_next/image?url=%2Ffoto.png&w=64", "../ativos/imagens/a1.png"],
      ]),
    );

    expect(saida).toBe('<img src="../ativos/imagens/a1.png" />');
  });

  it("não confunde endereços parecidos", () => {
    /*
     * URL tem `?`, `&` e `.`, que numa regex significam outra coisa. A
     * primeira versão montava regex com a URL e trocava endereços parecidos
     * pelo arquivo errado — a foto de uma pessoa no lugar da de outra, que é
     * um defeito que ninguém encontra olhando uma página de cada vez.
     */
    const html = '<img src="/foto.png" /><img src="/foto.png?v=2" />';
    const saida = reescreverImagens(
      html,
      new Map([
        ["/foto.png", "../ativos/imagens/a.png"],
        ["/foto.png?v=2", "../ativos/imagens/b.png"],
      ]),
    );

    expect(saida).toContain('src="../ativos/imagens/a.png"');
    expect(saida).toContain('src="../ativos/imagens/b.png"');
    // E nenhum dos dois virou o arquivo do outro com sufixo pendurado.
    expect(saida).not.toMatch(/a\.png\?v=2/);
  });

  it("troca a mesma URL em todas as ocorrências", () => {
    const html = '<img src="/a.png" /><img src="/a.png" />';
    const saida = reescreverImagens(html, new Map([["/a.png", "x.png"]]));

    expect((saida.match(/x\.png/g) ?? []).length).toBe(2);
  });
});

describe("a barreira de saída", () => {
  it("passa num HTML limpo", () => {
    expect(problemasDoHtml('<html><img src="../ativos/imagens/a.png" /></html>')).toEqual([]);
  });

  it.each([
    ['<script src="/_next/x.js"></script>', "script"],
    ['<p nonce="abc">x</p>', "nonce"],
    ['<a href="http://127.0.0.1:3000/x">x</a>', "endereço da máquina"],
    ['<img src="/_next/image?url=x" />', "otimizador"],
    ['<img src="https://abc.supabase.co/storage/v1/object/sign/x" />', "URL assinada"],
    ['<img src="https://media.giphy.com/x.gif" />', "GIPHY"],
  ])("reprova %s", (html) => {
    expect(problemasDoHtml(html).length).toBeGreaterThan(0);
  });

  it("diz o motivo, não só que reprovou", () => {
    const [motivo] = problemasDoHtml(
      '<img src="https://abc.supabase.co/storage/v1/object/sign/x" />',
    );

    // "vale 600 segundos" é a informação que faz alguém entender o problema.
    expect(motivo).toContain("600 segundos");
  });

  it("não reprova o script do interruptor", () => {
    expect(problemasDoHtml('<script data-hub-tema src="../ativos/tema.js"></script>')).toEqual([]);
  });
});

describe("a procedência", () => {
  const texto = procedencia({
    titulo: "Comunidade com tópicos",
    rota: "/c/<slug>",
    origem: "app/(app)/c/[comunidade]/page.tsx",
    layouts: ["app/(app)/layout.tsx", "app/layout.tsx"],
    estado: "Capa, Hot Topic fixado, lista de tópicos.",
    componentes: ["TopicCard", "HotTopicCard"],
    commit: "abc1234",
    data: "2026-11-24",
  });

  it("diz que é retrato e traz a data", () => {
    expect(texto).toContain("RETRATO, não app");
    expect(texto).toContain("2026-11-24");
    expect(texto).toContain("abc1234");
  });

  it("diz que nada é interativo", () => {
    expect(texto).toContain("nada aqui é interativo");
  });

  it("aponta o arquivo que desenha", () => {
    expect(texto).toContain("app/(app)/c/[comunidade]/page.tsx");
  });

  it("repete a ressalva dos componentes", () => {
    // Sem ela, "componentes no caminho" é lido como "componentes visíveis".
    expect(texto).toContain("não necessariamente visíveis");
  });

  it("é comentário HTML fechado", () => {
    expect(texto.startsWith("<!--")).toBe(true);
    expect(texto.trimEnd().endsWith("-->")).toBe(true);
  });
});
