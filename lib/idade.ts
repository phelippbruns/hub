/**
 * A idade mínima do Hub, num lugar só.
 *
 * **16 anos**, decidido pelo PO em 24 de novembro de 2026 e o número que a
 * RN29 e o escopo sempre disseram.
 *
 * Mora aqui, e não em `lib/auth/age-verifier.ts`, porque **três telas
 * precisam dele** — criar conta, completar cadastro e os Termos — e duas
 * delas são componentes de cliente. O verificador lê `process.env` e é
 * código de servidor; arrastá-lo para o pacote do navegador por causa de um
 * número é o mesmo erro que `lib/status.ts` e `features/<nome>/shared.ts`
 * existem para evitar. Sem import nenhum e sem `"use client"`, este arquivo
 * serve aos dois lados.
 *
 * **E por que num lugar só.** O número estava escrito à mão em quatro
 * lugares: a constante dizia 18 e o escopo dizia 16, e isso durou mais de um
 * mês sem nada reclamar. Um número que é a porta do Hub, duplicado, erra em
 * silêncio nos dois sentidos — barra quem podia entrar, ou aceita quem a
 * RN29 queria barrar — e nenhum dos dois aparece como erro.
 *
 * `lib/idade.test.ts` varre as telas e reprova quem voltar a escrevê-lo.
 */
export const MINIMUM_AGE = 16;

/** "O Hub é para maiores de 16 anos." Mesma frase em toda tela que a diz. */
export const AVISO_DE_IDADE = `O Hub é para maiores de ${MINIMUM_AGE} anos.`;
