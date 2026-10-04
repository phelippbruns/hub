/**
 * Geração do @ (RN17: o @ é único na plataforma).
 *
 * A unicidade de verdade é do índice do banco. Esta função existe para sugerir
 * um @ a partir do nome e resolver colisão antes de tentar gravar — e o
 * `createProfile` ainda trata o caso de duas pessoas colidirem no mesmo
 * instante, que nenhuma checagem prévia cobre.
 */

/** Mesmo formato da constraint `profiles_handle_format`: a-z, 0-9 e _, 2 a 20. */
export const HANDLE_PATTERN = /^[a-z0-9_]{2,20}$/;
const MAX_LENGTH = 20;
const MIN_LENGTH = 2;

/** "Ana Lima" -> "analima"; "José D'Ávila" -> "josedavila". */
export function suggestHandle(name: string): string {
  const base = name
    .normalize("NFD")
    // remove os acentos que a decomposição separou
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, MAX_LENGTH);

  // Nome só de caracteres que não sobrevivem (ex.: só emoji) precisa de algo.
  return base.length >= MIN_LENGTH ? base : `pessoa${base}`.slice(0, MAX_LENGTH);
}

/**
 * Acrescenta um sufixo numérico sem passar do limite de 20 caracteres —
 * encurta a base em vez de estourar.
 */
export function withSuffix(base: string, suffix: number): string {
  const tail = String(suffix);
  return `${base.slice(0, MAX_LENGTH - tail.length)}${tail}`;
}

/**
 * Primeiro @ livre a partir do nome.
 *
 * `isTaken` consulta o banco; fica como parâmetro para a regra poder ser
 * testada sem banco e para esta função não importar o Prisma (regra de
 * segurança 1).
 */
export async function generateUniqueHandle(
  name: string,
  isTaken: (handle: string) => Promise<boolean>,
  maxAttempts = 50,
): Promise<string> {
  const base = suggestHandle(name);
  if (!(await isTaken(base))) return base;

  for (let suffix = 2; suffix < maxAttempts; suffix += 1) {
    const candidate = withSuffix(base, suffix);
    if (!(await isTaken(candidate))) return candidate;
  }

  // Muitas colisões: cai para um sufixo aleatório em vez de desistir.
  const random = Math.floor(Math.random() * 100_000);
  return withSuffix(base, random);
}
