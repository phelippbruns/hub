/**
 * O enquadramento de uma imagem dentro de um quadro: a foto de perfil
 * (RN30) e a capa da comunidade.
 *
 * A imagem é guardada inteira; o recorte é só a posição e o tamanho com que
 * ela é desenhada dentro do quadro. Isso tem duas consequências boas:
 * reenquadrar não degrada a foto, e o mesmo enquadramento serve a qualquer
 * tamanho de avatar.
 *
 * Por isso tudo aqui é **fração do quadro**, nunca pixel: o deslocamento
 * 0,1 move a imagem em 10 px num avatar de 100 e em 3 px num de 30, que é o
 * que mantém o rosto no mesmo lugar nos dois.
 *
 * O quadro **não é mais sempre quadrado**. O avatar é; a capa da comunidade
 * é uma faixa deitada, e de largura variável, porque ela ocupa a tela toda e
 * tem altura fixa. Por isso `ox` é fração da largura do quadro e `oy` é
 * fração da altura dele — num quadro quadrado dá no mesmo, que é o que
 * permitiu o avatar não mudar nem de valor nem de comportamento.
 *
 * Este módulo é puro — sem Prisma, sem React, sem Supabase. Precisa ser: a
 * tela usa para arrastar e o servidor usa para conferir, e **as duas contas
 * têm de ser a mesma**. Duas implementações divergiriam, e o sintoma seria
 * uma foto que fica certa ao ajustar e errada depois de salvar.
 */

export const ZOOM_MINIMO = 1;
export const ZOOM_MAXIMO = 3;

export type Enquadramento = {
  /** De 1 a 3. */
  zoom: number;
  /** Deslocamento horizontal, em fração do lado do quadro. */
  ox: number;
  /** Deslocamento vertical, em fração do lado do quadro. */
  oy: number;
};

export const ENQUADRAMENTO_PADRAO: Enquadramento = { zoom: 1, ox: 0, oy: 0 };

/** As medidas da imagem original, em pixels. */
export type Medidas = { largura: number; altura: number };

/**
 * O quadro em que a imagem é desenhada. Só a **proporção** importa: um
 * quadro de 2 por 1 e um de 600 por 300 dão o mesmo enquadramento.
 */
export const QUADRO_QUADRADO: Medidas = { largura: 1, altura: 1 };

/** Onde a imagem é desenhada dentro do quadro, na escala dele. */
export type Caixa = { largura: number; altura: number; esquerda: number; topo: number };

/**
 * A caixa da imagem dentro do quadro.
 *
 * O fator começa em "cobrir": o maior entre lado/largura e lado/altura, que
 * é o que garante que a imagem preenche o quadro no zoom 1. O zoom multiplica
 * a partir daí, então **zoom 1 nunca deixa buraco** — é o piso, não um
 * tamanho arbitrário.
 */
export function caixaDaImagem(
  medidas: Medidas,
  enquadramento: Enquadramento,
  quadro: Medidas = QUADRO_QUADRADO,
): Caixa {
  const fator =
    Math.max(quadro.largura / medidas.largura, quadro.altura / medidas.altura) *
    clamp(enquadramento.zoom, ZOOM_MINIMO, ZOOM_MAXIMO);

  const largura = medidas.largura * fator;
  const altura = medidas.altura * fator;

  return {
    largura,
    altura,
    esquerda: (quadro.largura - largura) / 2 + enquadramento.ox * quadro.largura,
    topo: (quadro.altura - altura) / 2 + enquadramento.oy * quadro.altura,
  };
}

/**
 * O deslocamento máximo em cada eixo, em fração do quadro.
 *
 * É metade do que sobra da imagem para fora do quadro. Passar disso é o que
 * abriria um buraco branco dentro da forma.
 */
export function limiteDoDeslocamento(
  medidas: Medidas,
  zoom: number,
  quadro: Medidas = QUADRO_QUADRADO,
): { x: number; y: number } {
  const caixa = caixaDaImagem(medidas, { zoom, ox: 0, oy: 0 }, quadro);
  return {
    x: Math.max(0, (caixa.largura - quadro.largura) / 2 / quadro.largura),
    y: Math.max(0, (caixa.altura - quadro.altura) / 2 / quadro.altura),
  };
}

/**
 * Traz o enquadramento para dentro do que é desenhável.
 *
 * A tela chama a cada pixel arrastado, para o gesto parar na borda em vez de
 * continuar e deixar buraco. O servidor chama de novo ao salvar, porque
 * nada que vem do formulário é confiável — e o resultado tem de ser o mesmo,
 * senão a foto muda de posição ao recarregar a página.
 */
export function dentroDoLimite(
  medidas: Medidas,
  enquadramento: Enquadramento,
  quadro: Medidas = QUADRO_QUADRADO,
): Enquadramento {
  const zoom = clamp(enquadramento.zoom, ZOOM_MINIMO, ZOOM_MAXIMO);
  const limite = limiteDoDeslocamento(medidas, zoom, quadro);

  return {
    zoom,
    ox: clamp(enquadramento.ox, -limite.x, limite.x),
    oy: clamp(enquadramento.oy, -limite.y, limite.y),
  };
}

/** Se o enquadramento deixaria parte do quadro vazia. */
export function deixaBuraco(
  medidas: Medidas,
  enquadramento: Enquadramento,
  quadro: Medidas = QUADRO_QUADRADO,
): boolean {
  const limite = limiteDoDeslocamento(medidas, enquadramento.zoom, quadro);
  const folga = 1e-6;

  return (
    enquadramento.zoom < ZOOM_MINIMO ||
    Math.abs(enquadramento.ox) > limite.x + folga ||
    Math.abs(enquadramento.oy) > limite.y + folga
  );
}

/**
 * Traz um número para dentro da faixa, tratando o lixo que vem de formulário.
 *
 * O que não é número vira **0 antes de ser limitado**, e não o mínimo: assim
 * o neutro de cada campo sai certo sem o chamador precisar dizer qual é —
 * para o zoom, cuja faixa é 1 a 3, o 0 sobe para 1; para o deslocamento,
 * cuja faixa cerca o zero, ele fica em 0, que é o centro. Cair no mínimo
 * jogaria a foto para o canto esquerdo quando o campo viesse vazio.
 *
 * O `=== 0 ? 0` apaga o zero negativo: `-0` é verdadeiro no banco e no JSON,
 * mas aparece como "-0" em mensagem de erro e quebra comparação exata em
 * teste, por nenhum ganho.
 */
function clamp(valor: number, minimo: number, maximo: number): number {
  const numero = Number.isFinite(valor) ? valor : 0;
  const limitado = Math.min(maximo, Math.max(minimo, numero));
  return limitado === 0 ? 0 : limitado;
}

/**
 * A âncora: que ponto da **imagem** fica no mesmo lugar dentro do quadro.
 *
 * Existe por causa da capa da comunidade, cujo quadro **muda de forma**: a
 * altura é fixa em 180 px e a largura é a da janela, então a mesma capa é
 * uma faixa 7:1 num monitor e quase 10:1 noutro. Um `ox` guardado contra uma
 * forma não serve para outra — num quadro mais largo ele abriria faixa vazia.
 *
 * A âncora não tem esse problema porque não fala do quadro: ela diz "o ponto
 * a 30% da largura da foto fica a 30% da largura da capa", que é exatamente
 * o que o `object-position` do CSS faz. Aplicada a qualquer forma, ela nunca
 * deixa buraco — o pior que acontece é o recorte escorregar alguns pixels
 * quando a janela muda de tamanho, que é o que já acontece hoje.
 *
 * O avatar continua guardando `ox`/`oy`: o quadro dele é sempre quadrado, e
 * converter o que já está no banco seria migração de dados por nada.
 *
 * Os dois extremos são 0 e 1; quando a imagem não sobra num eixo, não há o
 * que ancorar e o valor é 0,5 — o centro.
 */
export type Ancora = { x: number; y: number };

export const ANCORA_PADRAO: Ancora = { x: 0.5, y: 0.5 };

export function ancoraDoEnquadramento(
  medidas: Medidas,
  enquadramento: Enquadramento,
  quadro: Medidas = QUADRO_QUADRADO,
): Ancora {
  const caixa = caixaDaImagem(medidas, enquadramento, quadro);

  return {
    x: fracao(caixa.esquerda, quadro.largura - caixa.largura),
    y: fracao(caixa.topo, quadro.altura - caixa.altura),
  };
}

/**
 * O caminho de volta, para reabrir o ajuste com a capa onde ela ficou.
 *
 * Sem ele, quem clicasse em "Ajustar" veria a imagem pular para o centro, e
 * o único jeito de voltar ao enquadramento de antes seria acertá-lo de novo
 * no olho.
 */
export function enquadramentoDaAncora(
  medidas: Medidas,
  zoom: number,
  ancora: Ancora,
  quadro: Medidas = QUADRO_QUADRADO,
): Enquadramento {
  const caixa = caixaDaImagem(medidas, { zoom, ox: 0, oy: 0 }, quadro);
  const sobraX = quadro.largura - caixa.largura;
  const sobraY = quadro.altura - caixa.altura;

  return dentroDoLimite(
    medidas,
    {
      zoom,
      ox: (sobraX * (ancora.x - 0.5)) / quadro.largura,
      oy: (sobraY * (ancora.y - 0.5)) / quadro.altura,
    },
    quadro,
  );
}

/** Onde o número cai dentro da sobra, de 0 a 1. Sem sobra, o centro. */
function fracao(posicao: number, sobra: number): number {
  if (Math.abs(sobra) < 1e-9) return 0.5;
  return Math.min(1, Math.max(0, posicao / sobra));
}

/**
 * A caixa em porcentagens, prontas para o CSS.
 *
 * Mora aqui, e não em cada componente, porque a conta "caixa → estilo" já
 * estava escrita duas vezes — no ajuste e no avatar — e uma terceira cópia
 * com o quadro errado é o jeito mais fácil de a foto sair certa ao ajustar e
 * errada depois de salvar.
 */
export function porcentagens(
  caixa: Caixa,
  quadro: Medidas = QUADRO_QUADRADO,
): { width: string; height: string; left: string; top: string } {
  return {
    width: `${(caixa.largura / quadro.largura) * 100}%`,
    height: `${(caixa.altura / quadro.altura) * 100}%`,
    left: `${(caixa.esquerda / quadro.largura) * 100}%`,
    top: `${(caixa.topo / quadro.altura) * 100}%`,
  };
}

/**
 * O quadro de referência da capa da comunidade.
 *
 * É **referência**, não imposição: a capa tem altura fixa e largura de
 * tela, então a forma real muda com a janela. Este valor é o que a tela de
 * ajuste usa quando ainda não mediu a própria caixa, e o que o servidor usa
 * para reconferir o que veio do formulário. O que é guardado no fim é a
 * âncora, que não depende de nenhum quadro.
 *
 * 7 por 1 é a proporção de uma capa de 180 px de altura numa janela de
 * 1280, que é a menor em que o Hub é desenhado hoje (o celular é a F21).
 */
export const QUADRO_DA_CAPA: Medidas = { largura: 7, altura: 1 };
