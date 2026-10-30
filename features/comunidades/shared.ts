/**
 * O que a tela e o servidor da comunidade compartilham.
 *
 * Sem `"use client"` de propósito: a página é Server Component e precisa
 * ler a aba da URL antes de desenhar qualquer coisa. Exportar isto de
 * [abas.tsx](./abas.tsx), que é cliente, derrubava a página inteira com
 * "Attempted to call abaDaComunidade() from the server" — e nem o
 * `typecheck` nem o `lint` viam o problema.
 */
export type AbaDaComunidade = "inicio" | "membros";

/** Qualquer lixo na URL cai no Início, que é a aba de sempre. */
export function abaDaComunidade(valor: string | undefined): AbaDaComunidade {
  return valor === "membros" ? "membros" : "inicio";
}
