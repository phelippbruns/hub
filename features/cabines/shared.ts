/**
 * Constantes que a tela e o servidor compartilham.
 *
 * Moram aqui, e não em `lib/data/`, porque o composer é componente de
 * cliente: importar da camada de dados arrastaria o Prisma e o `pg` para o
 * pacote do navegador, e o build quebraria com "Can't resolve 'dns'".
 */

/** RN22 e RN25: 240 no convite; a mensagem da conversa usa o mesmo teto. */
export const LIMITE_DA_MENSAGEM = 240;

/** RN20: de 2 a 5 pessoas, então dá para convidar 4 além de você. */
export const MAXIMO_DE_CONVIDADOS = 4;
