/**
 * Marcar pessoas, comunidades e tópicos dentro do texto.
 *
 * Espelha [links.ts](./links.ts) de propósito: é o mesmo problema — achar um
 * pedaço dentro de texto livre, com acento ao lado, pontuação no fim e casos
 * que **parecem** mas não são. Lá o resultado é uma recusa; aqui é um link.
 *
 * Três sinais, e cada um usa o formato do endereço que ele abre:
 *
 * | Sinal | Marca      | Formato            | Abre                          |
 * |-------|------------|--------------------|-------------------------------|
 * | `@`   | pessoa     | `a-z 0-9 _`, 2–20  | `/lia`                        |
 * | `#`   | comunidade | `a-z 0-9 -`, 2–80  | `/c/musica-eletronica`        |
 * | `*`   | tópico     | `a-z 0-9 -`, 2–100 | `/c/<a desta resposta>/slug`  |
 *
 * Reconhecer aqui um formato mais largo do que o do cadastro e o do endereço
 * faria o Hub prometer marcação para algo que não pode existir.
 *
 * **O `*` só alcança a comunidade onde a resposta está.** O endereço do
 * tópico é único por comunidade, não no Hub inteiro — então `*primeira-festa`
 * sem comunidade junto seria ambíguo em qualquer outro lugar. Quem quer
 * apontar para outra comunidade usa `#`.
 */

export type TipoDeMarcacao = "pessoa" | "comunidade" | "topico";

/** Até onde vai uma marcação no texto. */
export type Marcacao = {
  tipo: TipoDeMarcacao;
  /** O identificador já em minúsculas, pronto para procurar no banco. */
  alvo: string;
  /** O trecho como foi escrito, incluindo o sinal. */
  trecho: string;
  inicio: number;
  fim: number;
};

/**
 * O que **não** é marcação, mesmo tendo o sinal.
 *
 * `fulano@exemplo.com` tem um `@exemplo` no meio, e ele não é uma pessoa.
 * A regra cobre o caso: sinal colado em letra, número ou ponto à esquerda
 * não começa marcação. É por isso que todo padrão exige início de texto ou
 * um separador antes.
 */
/*
 * Os três padrões, escritos por extenso.
 *
 * Montar com template seria menos repetitivo e **pior**: o lint recusa
 * `new RegExp` com argumento variável, com razão, e um padrão de segurança
 * escrito à mão é um padrão que dá para ler numa revisão.
 *
 * Todos exigem início de texto ou separador antes (`[^\p{L}\p{N}_.@#*]`),
 * que é o que impede `fulano@exemplo.com` e `nota#1` de virarem marcação.
 * O endereço tem no mínimo dois caracteres e nunca termina em hífen.
 */
const PADROES: { tipo: TipoDeMarcacao; sinal: string; padrao: RegExp }[] = [
  {
    tipo: "pessoa",
    sinal: "@",
    padrao: /(^|[^\p{L}\p{N}_.@#*])@([a-z0-9_]{2,20})(?![\p{L}\p{N}_])/giu,
  },
  {
    tipo: "comunidade",
    sinal: "#",
    padrao: /(^|[^\p{L}\p{N}_.@#*])#([a-z0-9][a-z0-9-]{0,78}[a-z0-9])(?![\p{L}\p{N}_])/giu,
  },
  {
    tipo: "topico",
    sinal: "*",
    padrao: /(^|[^\p{L}\p{N}_.@#*])\*([a-z0-9][a-z0-9-]{0,98}[a-z0-9])(?![\p{L}\p{N}_])/giu,
  },
];

/**
 * Todas as marcações do texto, na ordem, sem repetir.
 *
 * Sem repetir porque escrever `@lia` duas vezes é ênfase, não dois avisos —
 * e quem recebe dois avisos iguais aprende a ignorar os dois. A mesma coisa
 * vale para o link: dois links iguais na mesma frase não ajudam ninguém.
 */
export function acharMarcacoes(valor: string): Marcacao[] {
  const achadas: Marcacao[] = [];
  const vistos = new Set<string>();

  for (const { tipo, sinal, padrao } of PADROES) {
    for (const achado of valor.matchAll(padrao)) {
      const separador = achado[1] ?? "";
      const escrito = achado[2] ?? "";
      if (!escrito) continue;

      const alvo = escrito.toLowerCase();
      const chave = `${tipo}:${alvo}`;
      if (vistos.has(chave)) continue;
      vistos.add(chave);

      const inicio = (achado.index ?? 0) + separador.length;
      const trecho = `${sinal}${escrito}`;
      achadas.push({ tipo, alvo, trecho, inicio, fim: inicio + trecho.length });
    }
  }

  // Cada sinal é varrido numa passada; a ordem de leitura é a do texto.
  return achadas.sort((a, b) => a.inicio - b.inicio);
}

/** O que foi marcado, separado por tipo, para procurar no banco de uma vez. */
export function alvosMarcados(valor: string): {
  pessoas: string[];
  comunidades: string[];
  topicos: string[];
} {
  const marcacoes = acharMarcacoes(valor);
  const doTipo = (tipo: TipoDeMarcacao) =>
    marcacoes.filter((m) => m.tipo === tipo).map((m) => m.alvo);

  return {
    pessoas: doTipo("pessoa"),
    comunidades: doTipo("comunidade"),
    topicos: doTipo("topico"),
  };
}

/** Os @ do texto, só os nomes — é o que a notificação precisa (RN34). */
export function handlesMencionados(valor: string): string[] {
  return alvosMarcados(valor).pessoas;
}

/** Um pedaço de texto: ou é texto comum, ou é uma marcação que existe. */
export type PedacoDeTexto =
  | { tipo: "texto"; valor: string }
  | { tipo: "marcacao"; marcacao: TipoDeMarcacao; alvo: string; trecho: string };

/** Quem existe de verdade, por tipo. Quem não está aqui vira texto comum. */
export type MarcacoesExistentes = {
  pessoas: Set<string>;
  comunidades: Set<string>;
  topicos: Set<string>;
};

function existe(alvo: string, tipo: TipoDeMarcacao, existentes: MarcacoesExistentes): boolean {
  // `switch` e não índice por variável: ler objeto com chave em variável
  // acende o aviso de injeção no lint, e ele tem razão em princípio.
  switch (tipo) {
    case "pessoa":
      return existentes.pessoas.has(alvo);
    case "comunidade":
      return existentes.comunidades.has(alvo);
    case "topico":
      return existentes.topicos.has(alvo);
  }
}

/**
 * Quebra o texto em pedaços, para a tela desenhar as marcações como link.
 *
 * O que não foi encontrado no banco vira **texto comum**: um `@`, `#` ou `*`
 * de nada não pode virar link quebrado, e o Hub não deve inventar que aquela
 * pessoa, comunidade ou tópico existe.
 */
export function pedacosMarcados(valor: string, existentes: MarcacoesExistentes): PedacoDeTexto[] {
  const pedacos: PedacoDeTexto[] = [];
  let cursor = 0;

  for (const marcacao of acharMarcacoes(valor)) {
    if (!existe(marcacao.alvo, marcacao.tipo, existentes)) continue;
    // Marcações não se sobrepõem, mas texto é texto: um trecho já consumido
    // nunca é cortado duas vezes.
    if (marcacao.inicio < cursor) continue;

    if (marcacao.inicio > cursor) {
      pedacos.push({ tipo: "texto", valor: valor.slice(cursor, marcacao.inicio) });
    }
    pedacos.push({
      tipo: "marcacao",
      marcacao: marcacao.tipo,
      alvo: marcacao.alvo,
      trecho: marcacao.trecho,
    });
    cursor = marcacao.fim;
  }

  if (cursor < valor.length) {
    pedacos.push({ tipo: "texto", valor: valor.slice(cursor) });
  }

  return pedacos;
}

/**
 * A marcação que está sendo escrita agora, se houver.
 *
 * Olha para trás a partir do cursor até achar um dos três sinais, e desiste
 * no primeiro espaço: `@li` sugere, `@lia souza` não — a pessoa já terminou
 * de escrever e passou para a frase.
 */
export function marcacaoSobOCursor(
  texto: string,
  cursor: number,
): { tipo: TipoDeMarcacao; termo: string; inicio: number; fim: number } | null {
  const antes = texto.slice(0, cursor);

  const candidatos = PADROES.map(({ tipo, sinal }) => ({
    tipo,
    sinal,
    posicao: antes.lastIndexOf(sinal),
  })).filter((c) => c.posicao !== -1);

  if (candidatos.length === 0) return null;

  // O sinal mais à direita é o que está sendo escrito.
  const escolhido = candidatos.reduce((a, b) => (b.posicao > a.posicao ? b : a));
  const escrito = antes.slice(escolhido.posicao + 1);

  // Espaço depois do sinal quer dizer que a marcação já acabou.
  if (/\s/.test(escrito)) return null;
  /*
   * Cada sinal tem o seu formato, e sair dele encerra a sugestão: `@lia-`
   * não é um @ sendo escrito, porque o hífen não existe no formato do @ —
   * sugerir ali seria oferecer alguém que a pessoa não pode marcar.
   */
  const formato = escolhido.tipo === "pessoa" ? /^[a-zA-Z0-9_]*$/ : /^[a-zA-Z0-9-]*$/;
  if (!formato.test(escrito)) return null;

  // Sinal colado em letra é email, ou conta de outro lugar — não é marcação.
  const anterior = escolhido.posicao > 0 ? texto[escolhido.posicao - 1] : "";
  if (anterior && /[\p{L}\p{N}_.]/u.test(anterior)) return null;

  return {
    tipo: escolhido.tipo,
    termo: escrito.toLowerCase(),
    inicio: escolhido.posicao,
    fim: cursor,
  };
}
