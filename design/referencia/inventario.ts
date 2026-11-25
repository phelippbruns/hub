import { existsSync, readFileSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * **Da tela para o arquivo que a desenha.**
 *
 * A pasta de páginas de referência mostra como o Hub é hoje. Isto responde a
 * pergunta seguinte, que é a que importa para redesenhar: *onde eu mexo?*
 *
 * Sem isto, "redesenhe o cartão de contribuição" obriga quem recebe o pedido
 * a ler trinta arquivos para achar os seis lugares em que ele aparece. Com
 * isto, é uma consulta.
 *
 * **Por grafo estático de imports**, e as três alternativas foram descartadas
 * por motivo, não por preguiça:
 *
 * - **marcar o DOM na captura** sujaria os 62 componentes com um atributo que
 *   só serve a uma ferramenta de design, e iria para produção;
 * - **derivar das classes do Tailwind** não funciona: classe não é
 *   identidade. `rounded-sm border-line` é de pelo menos quatro componentes;
 * - **lista escrita à mão** diverge em silêncio, e inventário que mente é
 *   pior do que inventário nenhum.
 *
 * **Com o parser do TypeScript, não com regex.** A primeira ideia foi
 * `^import .* from "(.*)"` por linha — e `app/(app)/inicio/page.tsx` tem
 * import de várias linhas, que a regex cortaria no meio sem reclamar. O
 * `typescript` já é dependência do projeto; usar o parser dele custa zero e
 * acerta `import type`, reexport e import de efeito colateral.
 *
 * **O que o rótulo promete, e o que não promete.** É "componentes no caminho
 * desta rota", não "visíveis neste estado": um ramo condicional pode não
 * estar na tela capturada. A honestidade está no nome, e o `MAPA.md` repete a
 * ressalva na primeira linha.
 */

/**
 * A raiz do repositório, para `@/` e para caminhos relativos ao projeto.
 *
 * `process.cwd()`, e **não** `import.meta.dirname`: o Playwright transforma
 * este arquivo para CommonJS, onde `import.meta` nem existe — e o erro que
 * ele dá ("Cannot use 'import.meta' outside a module") aponta para a linha do
 * `import`, não para a linha culpada. É também a convenção que as outras
 * varreduras do projeto já usam (`design/tokens.test.ts`,
 * `lib/rotas.test.ts`): caminho relativo à raiz, com os comandos npm rodando
 * de lá.
 */
const RAIZ = resolve(process.cwd());

/** O barril do design system. É ele que dá nome a cada componente. */
const BARRIL = join("design", "components", "index.ts");

/**
 * Onde o andador para.
 *
 * `lib/data/` está aqui por regra do projeto, não por economia: componente de
 * cliente não importa `lib/data/`, e seguir para lá arrastaria o Prisma para
 * um inventário de design.
 */
const PARA_EM = ["node_modules", join("lib", "data")];

const EXTENSOES = [".tsx", ".ts"];

/** `@/design/components` → caminho no disco. `./linha` → idem, relativo. */
function resolverImport(deArquivo: string, especificador: string): string | null {
  if (!especificador.startsWith(".") && !especificador.startsWith("@/")) return null;

  const base = especificador.startsWith("@/")
    ? join(RAIZ, especificador.slice(2))
    : resolve(dirname(join(RAIZ, deArquivo)), especificador);

  for (const candidato of [
    base,
    ...EXTENSOES.map((e) => base + e),
    ...EXTENSOES.map((e) => join(base, "index" + e)),
  ]) {
    if (existsSync(candidato) && !candidato.endsWith(".css")) {
      try {
        if (readFileSync(candidato).length >= 0) {
          const rel = relative(RAIZ, candidato);
          // Diretório casa em existsSync; só arquivo serve.
          if (EXTENSOES.some((e) => rel.endsWith(e))) return rel;
        }
      } catch {
        // Diretório: segue para o próximo candidato.
      }
    }
  }

  return null;
}

type Importacao = { de: string; nomes: string[] };

/** Os imports de um arquivo, pelo parser do TypeScript. */
/**
 * O que já foi lido e analisado, nesta execução.
 *
 * O mapa anda 40 telas, e as telas compartilham quase tudo — a cadeia de
 * layouts, o barril, os componentes comuns. Sem isto, o mesmo arquivo era
 * lido do disco e analisado pelo TypeScript dezenas de vezes, e o teste do
 * mapa passou dos **5 segundos** que o Vitest dá por padrão: ele reprovava
 * na suíte cheia e passava sozinho, que é a cara de uma corrida e não era.
 *
 * Guardar é seguro porque os arquivos não mudam durante uma execução — e,
 * se mudassem, a varredura estaria medindo dois estados do repositório.
 */
const analisados = new Map<string, Importacao[]>();

export function importacoesDe(arquivo: string): Importacao[] {
  const guardado = analisados.get(arquivo);
  if (guardado) return guardado;

  const fonte = ts.createSourceFile(
    arquivo,
    readFileSync(join(RAIZ, arquivo), "utf8"),
    ts.ScriptTarget.ESNext,
    /* setParentNodes */ false,
    ts.ScriptKind.TSX,
  );

  const achados: Importacao[] = [];

  for (const statement of fonte.statements) {
    const ehImport = ts.isImportDeclaration(statement);
    const ehReexport = ts.isExportDeclaration(statement) && statement.moduleSpecifier;
    if (!ehImport && !ehReexport) continue;

    const especificador = ehImport ? statement.moduleSpecifier : statement.moduleSpecifier!;
    if (!ts.isStringLiteral(especificador)) continue;

    const nomes: string[] = [];
    const clausula = ehImport ? statement.importClause : statement.exportClause;

    /*
     * Tipo não entra.
     *
     * O barril marca cada um: `export { Avatar, type TamanhoDeAvatar }`. Sem
     * esta conferência o inventário diria "71 componentes" quando são 62 — e
     * um número inflado num relatório de cobertura é pior do que nenhum,
     * porque ele parece completo.
     *
     * `isTypeOnly` cobre as duas formas: a palavra no elemento
     * (`type TamanhoDeAvatar`) e na cláusula inteira (`import type { … }`).
     */
    if (clausula) {
      if (ts.isImportClause(clausula)) {
        if (clausula.isTypeOnly) continue;
        if (clausula.name) nomes.push(clausula.name.text);
        if (clausula.namedBindings && ts.isNamedImports(clausula.namedBindings)) {
          for (const e of clausula.namedBindings.elements) {
            if (!e.isTypeOnly) nomes.push(e.name.text);
          }
        }
      } else if (ts.isNamedExports(clausula)) {
        if (ehReexport && (statement as ts.ExportDeclaration).isTypeOnly) continue;
        for (const e of clausula.elements) {
          if (!e.isTypeOnly) nomes.push(e.name.text);
        }
      }
    }

    achados.push({ de: especificador.text, nomes });
  }

  analisados.set(arquivo, achados);
  return achados;
}

/**
 * Nome exportado → arquivo, lendo o barril do design system.
 *
 * `export { Avatar, type TamanhoDeAvatar } from "./avatar"` dá duas entradas,
 * e o tipo entra junto: separar tipo de componente aqui exigiria entender o
 * que cada nome é, e o custo de um tipo a mais na lista é zero — ele
 * simplesmente nunca é importado por uma página.
 */
export function mapaDoBarril(): Map<string, string> {
  const mapa = new Map<string, string>();

  for (const { de, nomes } of importacoesDe(BARRIL)) {
    const arquivo = resolverImport(BARRIL, de);
    if (!arquivo) continue;
    for (const nome of nomes) mapa.set(nome, arquivo);
  }

  return mapa;
}

export type Inventario = {
  /** Arquivos de `app/` e `features/` no caminho desta rota. */
  arquivos: string[];
  /** Componentes do design system no caminho desta rota, em ordem alfabética. */
  componentes: string[];
};

/**
 * Tudo que está no caminho de desenhar estes arquivos de entrada.
 *
 * Entra o `page.tsx` **e a cadeia de layouts**: metade do que se vê numa tela
 * do Hub — a barra de navegação, a coluna de conteúdo, o menu de criar — vem
 * do layout, não da página. Um inventário que começasse só no `page.tsx`
 * diria que a `NavRail` não aparece em tela nenhuma.
 */
export function inventarioDe(entradas: string[]): Inventario {
  const barril = mapaDoBarril();
  const porArquivo = new Map<string, string[]>();
  for (const [nome, arquivo] of barril) {
    porArquivo.set(arquivo, [...(porArquivo.get(arquivo) ?? []), nome]);
  }

  const vistos = new Set<string>();
  const fila = [...entradas];
  const arquivos = new Set<string>();
  const componentes = new Set<string>();

  while (fila.length > 0) {
    const atual = fila.shift()!;
    if (vistos.has(atual)) continue;
    vistos.add(atual);

    if (atual.startsWith("app/") || atual.startsWith("features/")) arquivos.add(atual);

    /*
     * **Componente usado dentro de outro componente também conta.**
     *
     * A primeira versão parava nos nomes importados pela rota, e o mapa saiu
     * dizendo que `PerfilLinks` não aparece em tela nenhuma. Ele aparece em
     * toda tela de perfil — desenhado **dentro** do `ProfileHeader`, que é
     * quem a rota importa. Um inventário que só vê o primeiro nível erra em
     * silêncio, e erra justamente nos componentes pequenos, que são os que
     * mais se repetem num redesenho.
     *
     * Andar o arquivo de um componente é diferente de andar o barril: o
     * barril importa os 62 e levaria tudo para dentro de toda rota. O
     * arquivo importa só o que ele compõe de verdade.
     */
    if (atual.startsWith(join("design", "components"))) {
      for (const nome of porArquivo.get(atual) ?? []) componentes.add(nome);
    }

    for (const { de, nomes } of importacoesDe(atual)) {
      /*
       * O barril é tratado pelo nome importado, não seguido como arquivo.
       * Seguir traria os 62 componentes para dentro de **toda** rota que
       * importa um só — e um inventário em que tudo aparece em tudo não
       * responde "onde eu mexo?".
       */
      const alvo = resolverImport(atual, de);
      if (alvo === BARRIL) {
        for (const nome of nomes) {
          if (barril.has(nome)) {
            componentes.add(nome);
            // E o arquivo dele entra na fila, para pegar o que ele compõe.
            fila.push(barril.get(nome)!);
          }
        }
        continue;
      }

      if (!alvo) continue;
      if (PARA_EM.some((parada) => alvo.startsWith(parada))) continue;

      // Componente importado direto do arquivo, sem passar pelo barril.
      for (const [nome, arquivoDoComponente] of barril) {
        if (arquivoDoComponente === alvo && nomes.includes(nome)) componentes.add(nome);
      }

      fila.push(alvo);
    }
  }

  return {
    arquivos: [...arquivos].sort(),
    componentes: [...componentes].sort(),
  };
}

/** Todo nome que o barril exporta, para o índice invertido saber o que cobrar. */
export function componentesDoBarril(): string[] {
  return [...mapaDoBarril().keys()].sort();
}
