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

/** Chamado pela página de convite (tela 2, F06) quando alguém sem conta abre o link. */
export async function guardarConvite(topicId: string) {
  const jar = await cookies();
  jar.set(COOKIE, topicId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: DURACAO_SEGUNDOS,
  });
}

export async function lerConvite(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(COOKIE)?.value ?? null;
}

/** Consome o convite: depois de usado não deve sobrar para a próxima conta. */
export async function limparConvite() {
  const jar = await cookies();
  jar.delete(COOKIE);
}
