/**
 * Valores compartilhados entre as actions e as telas.
 *
 * Ficam fora de actions.ts porque num arquivo "use server" **todo export tem
 * de ser função assíncrona** — uma constante exportada apaga os exports do
 * módulo inteiro, e o erro que aparece não diz isso.
 */

/** Versão dos Termos aceita hoje. A F19 passa a servir o texto desta versão. */
export const TERMS_VERSION = "2026-10-01";

export type ActionState = { error?: string; fieldErrors?: Record<string, string> };

/**
 * Transforma os problemas do Zod num mapa por campo, guardando o primeiro de
 * cada um.
 *
 * A montagem usa `Map` em vez de escrever numa chave dinâmica de objeto:
 * `obj[chave] = valor` com chave vinda de fora alcança `__proto__`. As chaves
 * aqui vêm do schema, não da pessoa, mas o `Map` custa nada e tira a classe
 * inteira de problema do caminho.
 */
export function fieldErrorsFrom(
  issues: readonly { path: readonly PropertyKey[]; message: string }[],
): Record<string, string> {
  const errors = new Map<string, string>();
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "form");
    if (!errors.has(key)) errors.set(key, issue.message);
  }
  return Object.fromEntries(errors);
}
