/**
 * O que a tela e o servidor da comunidade compartilham.
 *
 * Sem `"use client"` de propósito: a página é Server Component e precisa
 * ler a aba da URL antes de desenhar qualquer coisa. Exportar isto de
 * [abas.tsx](./abas.tsx), que é cliente, derrubava a página inteira com
 * "Attempted to call abaDaComunidade() from the server" — e nem o
 * `typecheck` nem o `lint` viam o problema.
 */
export type AbaDaComunidade = "inicio" | "enquetes" | "eventos" | "membros";

/** Qualquer lixo na URL cai no Início, que é a aba de sempre. */
export function abaDaComunidade(valor: string | undefined): AbaDaComunidade {
  return valor === "membros" || valor === "enquetes" || valor === "eventos" ? valor : "inicio";
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

/**
 * O que a tela da comunidade mostra no centro.
 *
 * Três coisas disputam esse espaço — a aba, o tópico no painel (`?t=`) e o
 * evento (`?evento=`) — e a ordem entre elas é regra de produto, não detalhe.
 * Ela mora aqui, numa função pura, porque **é a parte que erraria calada**:
 * uma precedência trocada não quebra nada, só mostra a tela errada.
 *
 * As regras, e o porquê de cada uma:
 *
 * - **o evento ganha do tópico.** Os dois abertos ao mesmo tempo dariam duas
 *   conversas na tela, que é o "conteúdo espremido em três faixas estreitas"
 *   já tentado e revertido (ver `app/globals.css`, o bloco do `data-painel`).
 *   E como o painel não monta, a coluna da direita **permanece** — que é o
 *   ponto do evento abrir no centro;
 * - **a aba continua valendo com o evento aberto**, para a pílula certa ficar
 *   acesa e voltar à lista ser um clique;
 * - **lixo não derruba a página.** Um `?evento=` que não é identificador cai
 *   na aba, como `?aba=` lixo já cai no Início.
 */
export type TelaDaComunidade =
  | { centro: "aba"; aba: AbaDaComunidade; topico: string | null }
  | { centro: "evento"; aba: AbaDaComunidade; evento: string; topico: null };

/** Identificador de evento: é o uuid da linha, e nada além disso entra. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function telaDaComunidade(busca: {
  aba?: string;
  t?: string;
  evento?: string;
}): TelaDaComunidade {
  const aba = abaDaComunidade(busca.aba);
  const evento = busca.evento?.trim() ?? "";

  if (UUID.test(evento)) {
    return { centro: "evento", aba, evento, topico: null };
  }

  return { centro: "aba", aba, topico: busca.t?.trim() || null };
}
