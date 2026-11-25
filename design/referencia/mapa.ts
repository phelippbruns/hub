import { inventarioDe, mapaDoBarril } from "./inventario";
import { AUSENTES, PAGINAS, layoutsDe, type Pagina } from "./paginas";

/**
 * **O mapa: da tela para o arquivo, e do componente para as telas.**
 *
 * Duas saídas do mesmo cálculo. `mapa.json` para quem consome com código;
 * `MAPA.md` para quem lê — e "quem lê" inclui uma IA, que é o motivo de o
 * Markdown existir: ele cabe num contexto, e 40 páginas de HTML capturado
 * não cabem.
 */

export type TelaNoMapa = Pagina & {
  layouts: string[];
  arquivos: string[];
  componentes: string[];
};

export type Mapa = {
  geradoEm: string;
  commit: string;
  /** A ressalva, no próprio dado: ninguém lê só o Markdown. */
  ressalva: string;
  telas: TelaNoMapa[];
  /**
   * Componente → o arquivo dele e as telas em que está no caminho.
   *
   * O arquivo vem do **barril**, não de uma conversão do nome. A primeira
   * versão derivava `TopicCard` → `topic-card.tsx` por regex — e adivinhar
   * onde a fonte existe é o defeito que este projeto inteiro evita. Basta um
   * componente com nome fora do padrão para o mapa apontar para um arquivo
   * que não existe, com cara de certo.
   */
  componentes: Record<string, { arquivo: string; telas: string[] }>;
  /** Componentes do barril que não aparecem em tela nenhuma do catálogo. */
  semTela: string[];
  ausentes: typeof AUSENTES;
};

const RESSALVA =
  "Cada tela lista os componentes **no caminho da rota**, não os visíveis naquele estado: " +
  "um ramo condicional pode não estar na tela capturada. Para mexer em algo, a lista é " +
  "suficiente; para afirmar que algo aparece, confira o retrato.";

export function montarMapa(commit: string, geradoEm = new Date()): Mapa {
  const telas: TelaNoMapa[] = PAGINAS.map((pagina) => {
    const layouts = layoutsDe(pagina.origem);
    const inv = inventarioDe([pagina.origem, ...layouts]);

    return { ...pagina, layouts, arquivos: inv.arquivos, componentes: inv.componentes };
  });

  const barril = mapaDoBarril();
  const componentes: Record<string, { arquivo: string; telas: string[] }> = {};
  for (const nome of [...barril.keys()].sort()) {
    componentes[nome] = {
      arquivo: barril.get(nome)!,
      telas: telas.filter((t) => t.componentes.includes(nome)).map((t) => t.id),
    };
  }

  return {
    geradoEm: geradoEm.toISOString().slice(0, 10),
    commit,
    ressalva: RESSALVA,
    telas,
    componentes,
    semTela: Object.entries(componentes)
      .filter(([, c]) => c.telas.length === 0)
      .map(([nome]) => nome),
    ausentes: AUSENTES,
  };
}

const AREAS: { id: Pagina["area"]; nome: string }[] = [
  { id: "entrada", nome: "Entrada e cadastro" },
  { id: "onboarding", nome: "Primeiros passos" },
  { id: "inicio", nome: "Início" },
  { id: "descoberta", nome: "Descoberta" },
  { id: "comunidade", nome: "Comunidade" },
  { id: "topico", nome: "Tópico e convite" },
  { id: "perfil", nome: "Perfil e blog" },
  { id: "cabine", nome: "Cabine" },
  { id: "moderacao", nome: "Moderação" },
  { id: "sistema", nome: "Sistema" },
];

/** O mesmo mapa como texto. É este arquivo que se lê antes de mexer em algo. */
export function mapaEmMarkdown(mapa: Mapa): string {
  const linhas: string[] = [];

  linhas.push("# Mapa das telas do Hub");
  linhas.push("");
  linhas.push(
    `Gerado em ${mapa.geradoEm}, do commit \`${mapa.commit}\`. ` +
      "**Não edite à mão** — rode `npm run referencia`.",
  );
  linhas.push("");
  linhas.push(`> ${mapa.ressalva}`);
  linhas.push("");
  linhas.push(
    `${mapa.telas.length} telas, ${Object.keys(mapa.componentes).length} componentes do design system.`,
  );
  linhas.push("");

  for (const area of AREAS) {
    const daArea = mapa.telas.filter((t) => t.area === area.id);
    if (daArea.length === 0) continue;

    linhas.push(`## ${area.nome}`);
    linhas.push("");

    for (const tela of daArea) {
      linhas.push(`### ${tela.titulo}`);
      linhas.push("");
      linhas.push(`- **retrato:** \`retratos/${tela.id}.png\``);
      linhas.push(`- **rota:** \`${tela.rota}\``);
      linhas.push(`- **desenha em:** \`${tela.origem}\``);
      linhas.push(`- **layouts:** ${tela.layouts.map((l) => `\`${l}\``).join(" → ")}`);
      linhas.push(`- **estado:** ${tela.estado}`);
      linhas.push(
        `- **componentes (${tela.componentes.length}):** ` +
          tela.componentes.map((c) => `\`${c}\``).join(", "),
      );
      linhas.push("");
    }
  }

  linhas.push("## Componente → telas");
  linhas.push("");
  linhas.push(
    "Para mexer num componente, estas são as telas em que conferir. " +
      "É o índice que transforma um pedido de redesenho numa lista de arquivos.",
  );
  linhas.push("");
  linhas.push("| Componente | Arquivo | Telas |");
  linhas.push("| --- | --- | --- |");

  for (const [nome, c] of Object.entries(mapa.componentes)) {
    if (c.telas.length === 0) continue;
    linhas.push(`| \`${nome}\` | \`${c.arquivo}\` | ${c.telas.length}: ${c.telas.join(", ")} |`);
  }
  linhas.push("");

  if (mapa.semTela.length > 0) {
    linhas.push("### Componentes que não aparecem em tela nenhuma");
    linhas.push("");
    linhas.push(
      `${mapa.semTela.length} dos ${Object.keys(mapa.componentes).length}. ` +
        "Isto é relatório de lacuna, não defeito: parte vive só na galeria `/design`, " +
        "parte está num estado que o catálogo não captura, e parte pode não ser mais usada. " +
        "Vale olhar antes de redesenhar — componente sem tela é componente sem prova.",
    );
    linhas.push("");
    linhas.push(mapa.semTela.map((n) => `\`${n}\``).join(", "));
    linhas.push("");
  }

  linhas.push("## Telas fora da pasta, e por quê");
  linhas.push("");
  for (const ausente of mapa.ausentes) {
    linhas.push(`- **\`${ausente.rota}\`** — ${ausente.porque}`);
  }
  linhas.push("");

  return linhas.join("\n");
}
