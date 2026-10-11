/**
 * RN16: achar endereços em texto, inclusive os escritos por extenso.
 *
 * Fica em `lib/texto/` e não em `lib/data/` porque a **tela também usa**: o
 * aviso aparece enquanto a pessoa digita, antes de qualquer envio. O
 * CLAUDE.md proíbe componente de cliente importar `lib/data/`, e com razão —
 * um reexport inocente arrasta o Prisma para o pacote do navegador.
 *
 * É usada em resposta, tópico, intro de comunidade, descrição de perfil e,
 * depois, na Cabine: a função mais reusada do Hub, e a que mais erra se for
 * escrita no susto.
 *
 * O que ela precisa acertar, nas duas direções:
 *
 * - **Pegar** `https://x.com`, `meusite.com`, `www.exemplo.com`, um email, e
 *   `meusite ponto com` — porque quem quer burlar escreve por extenso.
 * - **Não pegar** `etc.pode`, `R$ 3.50`, `Dr. Oliveira`, `3.5 km`. Recusar o
 *   texto de quem não fez nada é tão ruim quanto deixar passar o link.
 */

/**
 * Domínios de topo reconhecidos. Curta de propósito: a lista completa tem
 * mais de mil entradas, e várias são palavras comuns em português — `.pode`
 * não existe, mas `.art`, `.rio` e `.bar` existem, e transformariam frases
 * normais em links.
 */
const DOMINIOS = [
  "com",
  "br",
  "net",
  "org",
  "io",
  "co",
  "app",
  "dev",
  "me",
  "gg",
  "tv",
  "xyz",
  "link",
  "site",
  "info",
  "st",
  "ly",
  "gov",
  "edu",
] as const;

/*
 * A mesma lista aparece escrita dentro das duas expressões abaixo.
 *
 * É duplicação, e de propósito: montar a expressão com `new RegExp` e um
 * texto interpolado faz o lint de segurança apitar — com razão, porque em
 * geral é por aí que entra expressão vinda de fora. Como a lista é constante,
 * a saída honesta é escrever literal e **provar que as duas não divergem**:
 * `links.test.ts` confere que toda entrada de DOMINIOS está nas expressões.
 */

/*
 * Sem quantificador aninhado em nenhuma delas: `[a-z0-9][a-z0-9-]*` é linear.
 * A versão "bonita" com `(?:[a-z0-9-]*[a-z0-9])?` retrocede em tempo
 * quadrático numa string longa sem casamento — e isto roda em todo texto que
 * uma pessoa digita, a cada tecla.
 */
const PADROES: { nome: string; expressao: RegExp }[] = [
  // Qualquer esquema com barras: http://, ftp://, ws://
  { nome: "esquema", expressao: /\b[a-z][a-z0-9+.-]*:\/\/\S*/i },
  /*
   * Esquemas sem barra. A lista é fechada de propósito: um `[a-z]+:` genérico
   * pegaria "Observação: isso" e "Horário: 10h", que são texto comum.
   */
  { nome: "esquema sem barra", expressao: /\b(?:javascript|data|mailto|tel):\S*/i },
  // Email
  { nome: "email", expressao: /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i },
  // www.qualquercoisa
  { nome: "www", expressao: /\bwww\.[a-z0-9][a-z0-9.-]*/i },
  // dominio.com, com caminho opcional
  {
    nome: "domínio",
    expressao:
      /\b[a-z0-9][a-z0-9-]*\.(?:com|br|net|org|io|co|app|dev|me|gg|tv|xyz|link|site|info|st|ly|gov|edu)\b/i,
  },
  /*
   * Escrito por extenso: "meusite ponto com". É o caminho óbvio de quem quer
   * burlar a regra, e o critério de aceite desta feature cita este caso.
   *
   * Duas amarras, porque "ponto com" aparece em português normal — "chega no
   * ponto com calma", "nesse ponto com certeza":
   *
   * 1. A palavra antes de "ponto" tem **3 letras ou mais**, o que descarta
   *    "no", "ao", "em", "um".
   * 2. Depois do domínio vem **fim de texto ou pontuação**, nunca outra
   *    palavra — "nesse ponto com certeza" tem " certeza" depois.
   *
   * O preço: "visita meusite ponto com hoje" escapa. É o lado certo de
   * errar. Recusar o texto de quem não fez nada é pior do que deixar passar
   * um caso raro, porque a pessoa não tem como adivinhar o que o Hub não
   * gostou — e quem insiste cai na denúncia, que é da F16.
   */
  {
    nome: "por extenso, composto",
    expressao:
      /\b[a-z0-9][a-z0-9-]{2,}\s+ponto\s+(?:com|br|net|org|io|co|app|dev|me|gg|tv|xyz|link|site|info|st|ly|gov|edu)\s+ponto\s+(?:com|br|net|org|io|co|app|dev|me|gg|tv|xyz|link|site|info|st|ly|gov|edu)\b(?=[^a-z0-9]*$|[,.;:!?)\]]|\s*\n)/i,
  },
  {
    // E a forma simples. Separada da composta de propósito: uma expressão
    // só, com o trecho repetível, vira o tipo de padrão que pode ficar lento
    // em texto longo — e isso já me mordeu uma vez (ver o Faustão).
    nome: "por extenso",
    expressao:
      /\b[a-z0-9][a-z0-9-]{2,}\s+ponto\s+(?:com|br|net|org|io|co|app|dev|me|gg|tv|xyz|link|site|info|st|ly|gov|edu)\b(?=[^a-z0-9]*$|[,.;:!?)\]]|\s*\n)/i,
  },
];

/** Para o teste conferir que as expressões cobrem a lista inteira. */
export const DOMINIOS_RECONHECIDOS = DOMINIOS;

export type LinkAchado = {
  /** O trecho exato, para o aviso poder citá-lo. */
  trecho: string;
  inicio: number;
  fim: number;
};

/**
 * O primeiro endereço do texto, ou `null`.
 *
 * Devolve **onde** está, e não só que existe, para a tela poder mostrar à
 * pessoa o que precisa apagar. Dizer "links não são aceitos" num texto de 240
 * caracteres deixa a pessoa caçando o que fez de errado.
 */
export function acharLink(valor: string): LinkAchado | null {
  let melhor: LinkAchado | null = null;

  for (const { expressao } of PADROES) {
    const achado = expressao.exec(valor);
    if (!achado) continue;

    const inicio = achado.index;
    // O primeiro do texto é o que a pessoa vai procurar primeiro.
    if (melhor === null || inicio < melhor.inicio) {
      melhor = { trecho: achado[0], inicio, fim: inicio + achado[0].length };
    }
  }

  return melhor;
}

/** RN16: há endereço no texto? */
export function contemLink(valor: string): boolean {
  return acharLink(valor) !== null;
}
