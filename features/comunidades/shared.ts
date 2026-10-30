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

/**
 * O filtro da lista de tópicos, lido da URL.
 *
 * Mora aqui, e não em [controles-de-topicos.tsx](./controles-de-topicos.tsx),
 * porque a página é Server Component e precisa do valor antes de desenhar.
 * O `"use client"` contamina o arquivo inteiro: uma função utilitária
 * pendurada num arquivo de cliente derruba a página com 500, e nem o
 * typecheck nem o lint avisam. Já aconteceu, e está no Faustão.
 */
export type FiltroDeTopicos = "alta" | "recentes" | "seguindo" | "novas";

export function filtroDeTopicos(valor: string | undefined): FiltroDeTopicos {
  return valor === "recentes" || valor === "seguindo" || valor === "novas" ? valor : "alta";
}
