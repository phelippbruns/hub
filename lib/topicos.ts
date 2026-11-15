/**
 * Os limites do tópico que a tela e o servidor compartilham.
 *
 * **Sem `"use client"` e sem import**, pelo mesmo motivo de
 * [lib/status.ts](./status.ts): o formulário de criar tópico é componente
 * de cliente, e componente de cliente não importa `lib/data/` — um
 * reexport inocente arrasta o Prisma e o `pg` para o pacote do navegador, e
 * o build quebra com "Can't resolve 'dns'", que não diz nada sobre a causa.
 *
 * `lib/data/topics.ts` importa daqui e reexporta, para quem está no
 * servidor continuar achando o número onde a regra mora.
 */

/**
 * RN07: quantos tópicos cada pessoa cria por dia em cada comunidade.
 *
 * Era **1** até 15 de novembro de 2026, garantido por um índice único.
 * Índice único não conta: subir para 10 trocou o índice por um gatilho,
 * `topics_guard_daily_limit()`.
 *
 * O limite não existe só para conter volume. Ele é o que impede uma pessoa
 * de ocupar a lista inteira de uma comunidade num dia — e o ciclo das 00h
 * elege por pessoas diferentes respondendo, mas sai de uma lista que
 * passaria a ter dono. Por isso ele subiu em vez de sair.
 *
 * O mesmo número vive em `hub_topicos_por_dia()` no banco, que é quem
 * **garante** a regra. `lib/data/topicos.db.test.ts` falha se os dois
 * discordarem — número em dois lugares sem alarme é só questão de tempo.
 */
export const TOPICOS_POR_DIA = 10;
