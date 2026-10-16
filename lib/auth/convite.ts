import { cookies } from "next/headers";

/**
 * O convite que trouxe a pessoa ao Hub (RN31).
 *
 * "Quem chega por convite já tem a comunidade do convite selecionada e volta
 * ao tópico ao terminar."
 *
 * Entre abrir o link e terminar o onboarding há um cadastro inteiro, com
 * redirecionamentos do Supabase pelo caminho. Parâmetro de URL não sobrevive a
 * isso; cookie sobrevive.
 *
 * É `httpOnly` porque nenhum script precisa ler, e curto porque é lixo depois
 * que a pessoa entra.
 */
const COOKIE = "hub_convite";
const DURACAO_SEGUNDOS = 60 * 60 * 24; // um dia

/**
 * Quem escreve é o **proxy**, não a página.
 *
 * Gravar cookie durante a renderização não é permitido no App Router — a
 * página tentou e devolveu erro de servidor. O proxy roda antes de
 * renderizar e já decide sobre sessão, então é onde isto cabe.
 *
 * O valor é o **caminho** do tópico, não o id: assim o fim do onboarding
 * devolve a pessoa exatamente ao endereço que ela abriu, e não a um
 * redirecionamento equivalente.
 */
export const COOKIE_DO_CONVITE = COOKIE;
export const DURACAO_DO_CONVITE = DURACAO_SEGUNDOS;

export async function lerConvite(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

/** Consome o convite: depois de usado não deve sobrar para a próxima conta. */
export async function limparConvite() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
