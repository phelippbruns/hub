/**
 * Marcar pessoas com @ (F15).
 *
 * Espelha [links.ts](./links.ts) de propósito: é o mesmo problema — achar
 * um pedaço dentro de texto livre, com acento ao lado, pontuação no fim e
 * casos que **parecem** mas não são. Lá o resultado é uma recusa; aqui é um
 * link e um aviso.
 *
 * O formato do @ é o mesmo do cadastro (`handleSchema`): de 2 a 20, letras
 * minúsculas, números e `_`. Reconhecer aqui um formato mais largo faria o
 * Hub prometer marcação para um @ que não pode existir.
 */

/** Até onde vai um @ no texto. */
export type MencaoAchada = {
  /** O `@` sem a arroba, já em minúsculas — pronto para procurar no banco. */
  handle: string;
  /** O trecho como foi escrito, incluindo a arroba. */
  trecho: string;
  inicio: number;
  fim: number;
};

/**
 * O que **não** é marcação, mesmo tendo arroba.
 *
 * `fulano@exemplo.com` tem um `@exemplo` no meio, e ele não é uma pessoa.
 * A regra é simples e cobre o caso: arroba colada em letra, número ou ponto
 * à esquerda não começa marcação. É por isso que o padrão exige início de
 * texto ou um separador antes.
 */
const PADRAO = /(^|[^\p{L}\p{N}_.@])@([a-z0-9_]{2,20})(?![\p{L}\p{N}_])/giu;

/**
 * Todas as marcações do texto, na ordem, sem repetir.
 *
 * Sem repetir porque escrever `@lia` duas vezes é ênfase, não dois avisos —
 * e quem recebe dois avisos iguais aprende a ignorar os dois.
 */
export function acharMencoes(valor: string): MencaoAchada[] {
  const achadas: MencaoAchada[] = [];
  const vistos = new Set<string>();

  for (const achado of valor.matchAll(PADRAO)) {
    const separador = achado[1] ?? "";
    const handle = (achado[2] ?? "").toLowerCase();
    if (!handle) continue;

    const inicio = (achado.index ?? 0) + separador.length;
    const trecho = `@${achado[2]}`;

    if (vistos.has(handle)) continue;
    vistos.add(handle);

    achadas.push({ handle, trecho, inicio, fim: inicio + trecho.length });
  }

  return achadas;
}

/** Os @ do texto, só os nomes, para procurar no banco de uma vez. */
export function handlesMencionados(valor: string): string[] {
  return acharMencoes(valor).map((mencao) => mencao.handle);
}

/** Um pedaço de texto: ou é texto comum, ou é uma marcação. */
export type PedacoDeTexto =
  { tipo: "texto"; valor: string } | { tipo: "mencao"; handle: string; trecho: string };

/**
 * Quebra o texto em pedaços, para a tela desenhar as marcações como link.
 *
 * `existentes` é quem foi encontrado no banco. Quem não está na lista vira
 * **texto comum**: um `@` de ninguém não pode virar link quebrado, e o Hub
 * não deve inventar que aquela pessoa existe.
 */
export function pedacosComMencoes(valor: string, existentes: Set<string>): PedacoDeTexto[] {
  const pedacos: PedacoDeTexto[] = [];
  let cursor = 0;

  for (const mencao of acharMencoes(valor)) {
    if (!existentes.has(mencao.handle)) continue;

    if (mencao.inicio > cursor) {
      pedacos.push({ tipo: "texto", valor: valor.slice(cursor, mencao.inicio) });
    }
    pedacos.push({ tipo: "mencao", handle: mencao.handle, trecho: mencao.trecho });
    cursor = mencao.fim;
  }

  if (cursor < valor.length) {
    pedacos.push({ tipo: "texto", valor: valor.slice(cursor) });
  }

  return pedacos;
}

/**
 * O @ que está sendo escrito agora, se houver.
 *
 * Olha para trás a partir do cursor até achar a arroba, e desiste no
 * primeiro espaço: `@li` sugere, `@lia souza` não — a pessoa já terminou de
 * escrever o @ e passou para a frase.
 */
export function arrobaSobOCursor(
  texto: string,
  cursor: number,
): { termo: string; inicio: number; fim: number } | null {
  const antes = texto.slice(0, cursor);
  const arroba = antes.lastIndexOf("@");
  if (arroba === -1) return null;

  const escrito = antes.slice(arroba + 1);
  // Espaço depois da arroba quer dizer que o @ já acabou.
  if (/[\s]/.test(escrito)) return null;
  // Só o formato do @: fora dele, não é marcação sendo escrita.
  if (!/^[a-zA-Z0-9_]*$/.test(escrito)) return null;

  // Arroba colada em letra é email, não marcação.
  const anterior = arroba > 0 ? texto[arroba - 1] : "";
  if (anterior && /[\p{L}\p{N}_.]/u.test(anterior)) return null;

  return { termo: escrito.toLowerCase(), inicio: arroba, fim: cursor };
}
