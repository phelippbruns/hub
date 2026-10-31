/**
 * O que a tela e o servidor das enquetes compartilham.
 *
 * Sem `"use client"`: o formulário é cliente, e um componente de cliente
 * que importasse `lib/data/` arrastaria o Prisma para o pacote do
 * navegador — o build quebra com "Can't resolve 'dns'", que não diz nada
 * sobre a causa. Está no CLAUDE.md e no Faustão.
 */
export const DURACOES_EM_DIAS = [1, 3, 7] as const;
