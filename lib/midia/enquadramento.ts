/**
 * O enquadramento da foto de perfil (RN30).
 *
 * A imagem é guardada inteira; o recorte é só a posição e o tamanho com que
 * ela é desenhada dentro do quadro. Isso tem duas consequências boas:
 * reenquadrar não degrada a foto, e o mesmo enquadramento serve a qualquer
 * tamanho de avatar.
 *
 * Por isso tudo aqui é **fração do lado do quadro**, nunca pixel: o
 * deslocamento 0,1 move a imagem em 10 px num avatar de 100 e em 3 px num de
 * 30, que é o que mantém o rosto no mesmo lugar nos dois.
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

/** Onde a imagem é desenhada dentro de um quadro de lado `lado`. */
export type Caixa = { largura: number; altura: number; esquerda: number; topo: number };

/**
 * A caixa da imagem dentro do quadro.
 *
 * O fator começa em "cobrir": o maior entre lado/largura e lado/altura, que
 * é o que garante que a imagem preenche o quadro no zoom 1. O zoom multiplica
 * a partir daí, então **zoom 1 nunca deixa buraco** — é o piso, não um
 * tamanho arbitrário.
 */
export function caixaDaImagem(medidas: Medidas, enquadramento: Enquadramento, lado = 1): Caixa {
  const fator =
    Math.max(lado / medidas.largura, lado / medidas.altura) *
    clamp(enquadramento.zoom, ZOOM_MINIMO, ZOOM_MAXIMO);

  const largura = medidas.largura * fator;
  const altura = medidas.altura * fator;

  return {
    largura,
    altura,
    esquerda: (lado - largura) / 2 + enquadramento.ox * lado,
    topo: (lado - altura) / 2 + enquadramento.oy * lado,
  };
}

/**
 * O deslocamento máximo em cada eixo, em fração do quadro.
 *
 * É metade do que sobra da imagem para fora do quadro. Passar disso é o que
 * abriria um buraco branco dentro da forma.
 */
export function limiteDoDeslocamento(medidas: Medidas, zoom: number): { x: number; y: number } {
  const caixa = caixaDaImagem(medidas, { zoom, ox: 0, oy: 0 });
  return {
    x: Math.max(0, (caixa.largura - 1) / 2),
    y: Math.max(0, (caixa.altura - 1) / 2),
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
export function dentroDoLimite(medidas: Medidas, enquadramento: Enquadramento): Enquadramento {
  const zoom = clamp(enquadramento.zoom, ZOOM_MINIMO, ZOOM_MAXIMO);
  const limite = limiteDoDeslocamento(medidas, zoom);

  return {
    zoom,
    ox: clamp(enquadramento.ox, -limite.x, limite.x),
    oy: clamp(enquadramento.oy, -limite.y, limite.y),
  };
}

/** Se o enquadramento deixaria parte do quadro vazia. */
export function deixaBuraco(medidas: Medidas, enquadramento: Enquadramento): boolean {
  const limite = limiteDoDeslocamento(medidas, enquadramento.zoom);
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
