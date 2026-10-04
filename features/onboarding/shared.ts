/**
 * Valores compartilhados entre as actions, as telas e a camada de dados do
 * onboarding.
 *
 * Mora aqui, e não em lib/data/, porque um componente de cliente precisa
 * dele. Reexportar de lib/data/ arrastava o Prisma — e o `pg` por baixo —
 * para o pacote do navegador, e o build quebrava com "Can't resolve 'dns'",
 * que não diz nada sobre a causa real.
 *
 * Também não pode ficar em actions.ts: num arquivo "use server" todo export
 * tem de ser função assíncrona.
 */

/** RN31: o onboarding exige ao menos 3 comunidades. */
export const MINIMO_DE_COMUNIDADES = 3;

export type EstadoDoOnboarding = { erro?: string };
