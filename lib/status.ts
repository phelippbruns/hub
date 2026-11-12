/**
 * RN40: os cinco tipos de status do perfil, e o que cada um vale.
 *
 * **Sem `"use client"` e sem import nenhum**, de propósito — como
 * `lib/rotas.ts`. Este arquivo atravessa as três camadas: a pílula e o
 * editor são componentes de cliente, o schema Zod é servidor, e a camada de
 * dados fica no meio. Um componente de cliente **não pode** importar de
 * `lib/data/`, porque um reexport inocente arrasta o Prisma para o pacote do
 * navegador — então os limites que a tela mostra moram aqui, e
 * `lib/data/validation.ts` lê daqui também.
 *
 * Duas listas diriam números diferentes no dia em que uma mudasse.
 */

export const TIPOS_DE_STATUS = ["listening", "reading", "watching", "working", "custom"] as const;
export type TipoDeStatus = (typeof TIPOS_DE_STATUS)[number];

/**
 * O prefixo que a tela põe antes do texto, ou `null` no Personalizado.
 *
 * "Ouvindo Floating Points" é uma frase; o Personalizado já é a frase
 * inteira ("De férias até segunda") e um prefixo a quebraria.
 */
export function prefixoDoStatus(tipo: TipoDeStatus): string | null {
  // `switch` e não objeto indexado: o lint do Hub barra indexar por variável.
  switch (tipo) {
    case "listening":
      return "Ouvindo";
    case "reading":
      return "Lendo";
    case "watching":
      return "Assistindo";
    case "working":
      return "Trabalhando em";
    case "custom":
      return null;
  }
}

/** O nome do tipo na lista de escolha do editor. */
export function nomeDoStatus(tipo: TipoDeStatus): string {
  return prefixoDoStatus(tipo) ?? "Personalizado";
}

/**
 * O limite de caracteres de cada tipo.
 *
 * Diferentes de propósito: nos quatro com prefixo, o que a pessoa escreve é
 * só o complemento, e 40 bastam. O Personalizado é a frase toda, e aí os 60
 * são dela. Um limite único de 60 deixaria "Ouvindo " mais 60 caracteres
 * passar, e a pílula estouraria a linha no perfil de todo mundo.
 */
export function limiteDoStatus(tipo: TipoDeStatus): number {
  return tipo === "custom" ? 60 : 40;
}
