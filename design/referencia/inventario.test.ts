import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { componentesDoBarril, importacoesDe, inventarioDe, mapaDoBarril } from "./inventario";
import { montarMapa } from "./mapa";
import { AUSENTES, PAGINAS, layoutsDe } from "./paginas";

/**
 * **O mapa das páginas de referência, e as barreiras que ele aceita.**
 *
 * Freshness não dá para conferir aqui: saber se os retratos são de hoje
 * exigiria banco e build. O que dá — e é o que apodrece primeiro numa pasta
 * gerada — é o catálogo apontar para arquivo que saiu do lugar, e o andador
 * de imports parar de achar o que achava.
 */

describe("o andador de imports", () => {
  it("lê import de várias linhas", () => {
    /*
     * `app/(app)/inicio/page.tsx` tem import de várias linhas. A primeira
     * versão disto era uma regex por linha, que cortaria no meio sem
     * reclamar — e um inventário incompleto não tem como ser notado olhando.
     */
    const imports = importacoesDe("app/(app)/inicio/page.tsx");
    const doDesign = imports.find((i) => i.de === "@/design/components");

    expect(doDesign, "o import do barril não foi encontrado").toBeDefined();
    expect(doDesign!.nomes.length).toBeGreaterThan(1);
  });

  it("não conta tipo como componente", () => {
    // O barril marca cada um: `export { Avatar, type TamanhoDeAvatar }`.
    const nomes = componentesDoBarril();

    expect(nomes).toContain("Avatar");
    expect(nomes).not.toContain("TamanhoDeAvatar");
    expect(nomes).not.toContain("Level");
    expect(nomes).not.toContain("LevelMarkSize");
  });

  it("o barril tem 62 componentes", () => {
    /*
     * O número está no CLAUDE.md e é a base do relatório de cobertura.
     * Inflado por tipos ele daria 71 — e número inflado num relatório de
     * cobertura é pior do que nenhum, porque parece completo.
     */
    expect(componentesDoBarril()).toHaveLength(62);
  });

  it("todo arquivo do barril existe", () => {
    const perdidos = [...mapaDoBarril().values()].filter((a) => !existsSync(a));
    expect(perdidos).toEqual([]);
  });

  it("acha os componentes de verdade da rota da comunidade", () => {
    const inv = inventarioDe([
      "app/(app)/c/[comunidade]/page.tsx",
      ...layoutsDe("app/(app)/c/[comunidade]/page.tsx"),
    ]);

    // Da própria página.
    expect(inv.componentes).toContain("TopicCard");
    expect(inv.componentes).toContain("HotTopicCard");
    expect(inv.componentes).toContain("CommunityCover");

    /*
     * E da **cadeia de layouts**: metade do que se vê numa tela do Hub vem
     * do layout. Um inventário que começasse só no `page.tsx` diria que a
     * barra de navegação não aparece em tela nenhuma.
     */
    expect(inv.componentes).toContain("NavRail");
    expect(inv.componentes).toContain("AppShell");
  });

  it("acha componente composto dentro de outro componente", () => {
    /*
     * `PerfilLinks` não é importado por nenhuma página: ele é desenhado
     * **dentro** do `ProfileHeader`, que é quem a rota importa.
     *
     * A primeira versão deste andador parava no primeiro nível, e o mapa
     * saiu afirmando que `PerfilLinks` não aparece em tela nenhuma — com
     * cara de relatório de lacuna, quando era defeito da ferramenta. O erro
     * atinge justamente os componentes pequenos, que são os que mais se
     * repetem num redesenho.
     */
    const inv = inventarioDe([
      "app/(app)/perfil/page.tsx",
      ...layoutsDe("app/(app)/perfil/page.tsx"),
    ]);

    expect(inv.componentes).toContain("ProfileHeader");
    expect(inv.componentes).toContain("PerfilLinks");
  });

  it("não arrasta os 62 só porque a rota importa um", () => {
    /*
     * O barril é resolvido **pelo nome importado**, não seguido como
     * arquivo. Seguir traria tudo para dentro de toda rota, e um inventário
     * em que tudo aparece em tudo não responde "onde eu mexo?".
     *
     * **Medido contra duas rotas, e não contra o vazio.** A primeira versão
     * media só `/termos`, que não importa componente nenhum: ela passava com
     * zero, ou seja, passaria com o andador quebrado. Comparar uma tela
     * média com a mais cheia é o que torna a afirmação falsificável.
     */
    const config = inventarioDe([
      "app/(app)/configuracoes/page.tsx",
      ...layoutsDe("app/(app)/configuracoes/page.tsx"),
    ]);
    const comunidade = inventarioDe([
      "app/(app)/c/[comunidade]/page.tsx",
      ...layoutsDe("app/(app)/c/[comunidade]/page.tsx"),
    ]);

    // Positivo primeiro: as duas acham componentes de verdade.
    expect(config.componentes.length).toBeGreaterThan(10);
    expect(comunidade.componentes.length).toBeGreaterThan(30);

    // E a tela de configurações não herda o que é da comunidade.
    expect(config.componentes.length).toBeLessThan(comunidade.componentes.length);
    expect(config.componentes).not.toContain("TopicCard");
    expect(config.componentes).not.toContain("StarButton");

    /*
     * **`CommunityCover` fica de fora desta asserção de propósito.**
     *
     * Eu a escrevi aqui primeiro, achando que capa de comunidade era coisa
     * da comunidade — e o teste reprovou com razão: o menu "Criar" vive na
     * barra de navegação de **toda** tela, e ele compõe o formulário de
     * comunidade nova, que usa a capa. A ferramenta estava certa e minha
     * expectativa errada.
     *
     * Fica registrado porque é um fato do produto, não um detalhe do teste:
     * o que a barra compõe está no caminho de todas as telas de dentro.
     */
    expect(config.componentes).toContain("CommunityCover");
    expect(config.componentes).toContain("SwitchRow");
  });

  it("os componentes que nenhuma tela do produto usa são nomeados", () => {
    /*
     * Relatório de lacuna, não defeito — mas um relatório que precisa ser
     * **verdadeiro**. Em 24 de novembro de 2026 eram dois: `CommunityRow` e
     * `TopicRow`, que existem no design system e não aparecem em nenhuma
     * tela do produto, só na galeria.
     *
     * Este teste não exige que sejam esses dois: exige que a conta feche. Se
     * alguém passar a usá-los, ou acrescentar um componente que ninguém usa,
     * o número muda e alguém olha. Travar os nomes transformaria um
     * relatório em obrigação de nunca mexer.
     */
    const mapa = montarMapa("teste");
    const soNaGaleria = Object.entries(mapa.componentes)
      .filter(([, c]) => c.telas.length === 1 && c.telas[0] === "design-galeria")
      .map(([nome]) => nome);

    expect(mapa.semTela, "componente que não aparece nem na galeria").toEqual([]);
    expect(
      soNaGaleria.length,
      `componentes que só a galeria usa: ${soNaGaleria.join(", ")}. ` +
        "Se o número subiu, o design system ganhou peça que o produto não usa.",
    ).toBeLessThanOrEqual(2);
  });

  it("para em lib/data, que componente de cliente nem pode importar", () => {
    const inv = inventarioDe([
      "app/(app)/inicio/page.tsx",
      ...layoutsDe("app/(app)/inicio/page.tsx"),
    ]);

    expect(inv.arquivos.filter((a) => a.startsWith("lib/data"))).toEqual([]);
  });
});

describe("o catálogo das telas de referência", () => {
  it("tem id único em todas", () => {
    const ids = PAGINAS.map((p) => p.id);
    expect(new Set(ids).size, `ids repetidos: ${ids.length - new Set(ids).size}`).toBe(ids.length);
  });

  it("o id serve de nome de arquivo", () => {
    const estranhos = PAGINAS.filter((p) => !/^[a-z0-9-]+$/.test(p.id)).map((p) => p.id);
    expect(estranhos).toEqual([]);
  });

  it.each(PAGINAS)("$id aponta para um page.tsx que existe", (pagina) => {
    expect(existsSync(pagina.origem), `${pagina.origem} não existe`).toBe(true);
  });

  it.each(PAGINAS)("$id tem estado escrito", (pagina) => {
    // Estado vazio é a tela sem explicação, que é metade do valor da pasta.
    expect(pagina.estado.length).toBeGreaterThan(20);
  });

  it("toda rota de app/ com desenho próprio está no catálogo ou declarada ausente", () => {
    /*
     * A barreira contra a lacuna silenciosa: rota nova que desenhe tela nova
     * **tem** de entrar na pasta ou dizer por que não entra. Sem isto a
     * pasta envelhece sem ninguém notar — e envelhecer sem avisar é o
     * defeito que `docs/telas.html` já tem.
     */
    const noCatalogo = new Set(PAGINAS.map((p) => p.origem));
    const explicadas = AUSENTES.map((a) => a.rota).join(" ");

    const comDesenho = [
      "app/(entrada)/page.tsx",
      "app/(entrada)/entrar/page.tsx",
      "app/(entrada)/criar-conta/page.tsx",
      "app/(entrada)/senha/page.tsx",
      "app/(entrada)/senha/codigo/page.tsx",
      "app/(entrada)/termos/page.tsx",
      "app/(apresentacao)/boas-vindas/page.tsx",
      "app/(apresentacao)/boas-vindas/notificacoes/page.tsx",
      "app/(app)/inicio/page.tsx",
      "app/(app)/comunidades/page.tsx",
      "app/(app)/busca/page.tsx",
      "app/(app)/comunidades/minhas/page.tsx",
      "app/(app)/comunidades/nova/page.tsx",
      "app/(app)/c/[comunidade]/page.tsx",
      "app/(app)/c/[comunidade]/[topico]/page.tsx",
      "app/(app)/c/[comunidade]/moderar/page.tsx",
      "app/(app)/perfil/page.tsx",
      "app/(app)/[handle]/page.tsx",
      "app/(app)/perfil/editar/page.tsx",
      "app/(app)/perfil/seguindo/page.tsx",
      "app/(app)/cabines/(lista)/page.tsx",
      "app/(app)/cabines/[cabine]/page.tsx",
      "app/(app)/cabines/nova/page.tsx",
      "app/(app)/notificacoes/page.tsx",
      "app/(app)/denuncia/page.tsx",
      "app/(app)/configuracoes/page.tsx",
      "app/design/page.tsx",
    ];

    const faltando = comDesenho.filter(
      (origem) => !noCatalogo.has(origem) && !explicadas.includes(origem),
    );

    expect(
      faltando,
      "rota com desenho próprio fora do catálogo. Acrescente em PAGINAS, ou em AUSENTES com o motivo.",
    ).toEqual([]);
  });

  it("as ausentes têm motivo escrito", () => {
    expect(AUSENTES.length).toBeGreaterThan(0);
    for (const ausente of AUSENTES) {
      expect(ausente.porque.length, `${ausente.rota} sem motivo`).toBeGreaterThan(40);
    }
  });
});
