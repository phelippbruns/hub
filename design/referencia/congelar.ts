/**
 * **De página servida para HTML que abre do disco.**
 *
 * As seis telas mais densas viram arquivo, para dar para mexer no CSS e ver o
 * resultado sem subir Docker. O resto da pasta é retrato — basta olhar.
 *
 * Tudo aqui é função pura sobre string: nada de rede, nada de navegador. O
 * motivo é poder testar antes de pagar os dez minutos de captura, e descobrir
 * um erro de reescrita em dois segundos em vez de na vigésima página.
 *
 * **O contrato das páginas congeladas, dito em voz alta:** sem os `<script>`
 * do Next não existe React. Menu não abre, painel não arrasta, contador não
 * conta. "Funcional" aqui quer dizer **fiel ao DOM e ao CSS reais** — e os
 * estados que importam (janela aberta, painel aberto) são capturados como
 * páginas próprias.
 */

/** O que não pode sobrar num HTML que precisa abrir do disco, e por quê. */
export const PROIBIDOS: { padrao: RegExp; porque: string }[] = [
  {
    padrao: /<script(?![^>]*\bdata-hub-tema\b)/i,
    porque:
      "script do Next sobrou. Sem o runtime do React ele não roda, e com o payload Flight a página pesa três vezes mais por nada.",
  },
  {
    padrao: /\snonce=/i,
    porque:
      "nonce de CSP sobrou. Ele é de uma requisição que já acabou; aqui não protege nada e só confunde quem for ler o HTML.",
  },
  {
    padrao: /127\.0\.0\.1|localhost:\d/i,
    porque: "endereço da máquina de quem capturou sobrou. Abre quebrado em qualquer outro lugar.",
  },
  {
    padrao: /\/_next\/image/i,
    porque:
      "otimizador de imagem do Next sobrou. Ele é uma rota do servidor: sem servidor, a imagem não aparece.",
  },
  {
    padrao: /supabase\.co|\/storage\/v1\/object\/sign/i,
    porque:
      "URL assinada do depósito sobrou. Ela vale 600 segundos — a página funcionaria hoje e quebraria amanhã, que é pior do que quebrar agora.",
  },
  {
    padrao: /giphy\.com/i,
    porque: "endereço do GIPHY sobrou. Depende de rede, e a pasta tem de abrir offline.",
  },
];

/** O que o congelador precisa saber para montar o `<head>` novo. */
export type Molde = {
  /** Caminho relativo do CSS, a partir da página. */
  css: string;
  /** Caminho relativo do script do interruptor de tema. */
  tema: string;
  /** O bloco de ficha, já em HTML, ou vazio. */
  ficha: string;
  /** O comentário de procedência, já em HTML. */
  procedencia: string;
};

/**
 * Troca as folhas de estilo originais por uma só, acrescenta o script do tema
 * e remove o que não pode viajar.
 *
 * A ordem das operações importa: **primeiro apagar, depois inserir**. Na
 * primeira versão eu inseria o script do tema antes de remover os scripts, e
 * a regex de remoção levava o meu junto — a página saía sem interruptor e sem
 * erro nenhum. Por isso o `data-hub-tema` existe no padrão proibido: ele é a
 * única exceção, e ela é explícita.
 */
export function congelarHtml(html: string, molde: Molde): string {
  let saida = html;

  // 1. Fora todo script, todo preload e o manifesto da PWA.
  saida = saida.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
  saida = saida.replace(/<script\b[^>]*\/>/gi, "");
  saida = saida.replace(
    /<link\b[^>]*\brel=["'](?:preload|modulepreload|manifest|prefetch)["'][^>]*>/gi,
    "",
  );

  // 2. Fora o nonce da CSP, que é de uma requisição que já acabou.
  saida = saida.replace(/\snonce=(["'])[^"']*\1/gi, "");

  // 3. Uma folha de estilo só, no lugar da primeira que aparecer.
  let primeira = true;
  saida = saida.replace(/<link\b[^>]*\brel=["']stylesheet["'][^>]*>/gi, () => {
    if (!primeira) return "";
    primeira = false;
    return `<link rel="stylesheet" href="${molde.css}" />`;
  });

  // 4. O script do tema, no fim do body, e a ficha antes dele.
  const rodape = `${molde.ficha}\n<script data-hub-tema src="${molde.tema}"></script>\n`;
  saida = saida.includes("</body>") ? saida.replace("</body>", `${rodape}</body>`) : saida + rodape;

  // 5. A procedência, antes de tudo: quem abrir o arquivo lê primeiro.
  return `${molde.procedencia}\n${saida}`;
}

/**
 * Reescreve os endereços de imagem para os arquivos locais.
 *
 * `mapa` vai de URL absoluta para caminho relativo. A substituição é por
 * **string inteira**, não por regex montada com a URL: URL tem `?`, `&` e
 * `.`, que numa regex significam outra coisa, e a primeira versão disto
 * trocava endereços parecidos pelo arquivo errado — a foto de uma pessoa
 * aparecendo no lugar da de outra.
 */
export function reescreverImagens(html: string, mapa: Map<string, string>): string {
  let saida = html;

  // Da URL mais longa para a mais curta: senão um prefixo come o sufixo.
  for (const url of [...mapa.keys()].sort((a, b) => b.length - a.length)) {
    saida = saida.split(url).join(mapa.get(url)!);
  }

  return saida;
}

/**
 * Deixa cada `<img>` com um `src` só, o que o navegador de fato escolheu.
 *
 * Roda **no navegador**, antes de serializar, porque só lá existe
 * `currentSrc`. O texto está aqui para o teste poder conferi-lo e para não
 * ficar perdido no meio da captura.
 *
 * Sem isto, cada imagem sai com um `srcset` de seis larguras do
 * `/_next/image`, e seriam seis downloads por imagem para que o navegador
 * escolhesse uma.
 */
export const NORMALIZAR_NO_NAVEGADOR = `() => {
  const urls = [];

  for (const img of document.querySelectorAll("img")) {
    const escolhido = img.currentSrc || img.src;
    if (escolhido) {
      img.setAttribute("src", escolhido);
      urls.push(escolhido);
    }
    img.removeAttribute("srcset");
    img.removeAttribute("sizes");
  }

  // <picture> com <source>: o <source> venceria o src do <img>.
  for (const source of document.querySelectorAll("picture source")) source.remove();

  // Capa de comunidade na tela de convite: vai em style, não em src.
  for (const elemento of document.querySelectorAll("[style*='background-image']")) {
    const achado = /url\\(["']?([^"')]+)["']?\\)/.exec(elemento.getAttribute("style") || "");
    if (achado && achado[1]) urls.push(new URL(achado[1], location.href).href);
  }

  return urls;
}`;

/**
 * A mesma função, **já chamada**, pronta para o `page.evaluate`.
 *
 * `evaluate` com uma string avalia a string como **expressão**: passar
 * `"() => {…}"` devolve a função, não o resultado dela. O sintoma foi
 * `urls is not iterable` três quadros abaixo, em quem usava o retorno — longe
 * da causa. Os parênteses em volta e o `()` no fim são o que faltava, e ficam
 * aqui para ninguém esquecê-los no lugar de uso.
 */
export const NORMALIZAR = `(${NORMALIZAR_NO_NAVEGADOR})()`;

/** Reprova o HTML que não pode viajar. Devolve os motivos, não só um booleano. */
export function problemasDoHtml(html: string): string[] {
  return PROIBIDOS.filter((p) => p.padrao.test(html)).map((p) => p.porque);
}

/**
 * O comentário de procedência.
 *
 * É a primeira coisa no arquivo porque é a primeira coisa que alguém precisa
 * saber: **isto é um retrato, com data**. Sem a data, uma página de dois
 * meses passa por estado atual do Hub.
 */
export function procedencia(dados: {
  titulo: string;
  rota: string;
  origem: string;
  layouts: string[];
  estado: string;
  componentes: string[];
  commit: string;
  data: string;
}): string {
  return [
    "<!--",
    `  ${dados.titulo}`,
    "",
    "  RETRATO, não app. Gerado por `npm run referencia` — não edite à mão.",
    "  Sem os scripts do Next não há React: nada aqui é interativo, de propósito.",
    "",
    `  rota:        ${dados.rota}`,
    `  desenha em:  ${dados.origem}`,
    `  layouts:     ${dados.layouts.join(" <- ")}`,
    `  estado:      ${dados.estado}`,
    `  capturado:   ${dados.data}, do commit ${dados.commit}`,
    "",
    `  componentes no caminho desta rota (${dados.componentes.length}):`,
    `  ${dados.componentes.join(", ")}`,
    "",
    "  Os componentes são os do caminho da rota, não necessariamente visíveis",
    "  neste estado: um ramo condicional pode não estar na tela. Para mexer, a",
    "  lista basta; para afirmar que algo aparece, olhe o retrato.",
    "-->",
  ].join("\n");
}
