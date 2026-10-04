import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getProfileByAuthId } from "@/lib/data/profiles";
import { safeDestination } from "@/lib/auth/redirect";

/**
 * Retorno do login com Google.
 *
 * Item 9 da F03: o destino passa por `safeDestination` antes de qualquer
 * redirecionamento. Sem isso, `?next=https://site-falso.com` mandaria a pessoa
 * recém-autenticada para fora — é assim que se rouba sessão em fluxo de OAuth.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeDestination(url.searchParams.get("next"));

  if (!code) {
    return NextResponse.redirect(new URL("/entrar?erro=retorno_invalido", url.origin));
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(new URL("/entrar?erro=retorno_invalido", url.origin));
  }

  // RN29: o Google não substitui a verificação de idade nem o aceite dos
  // Termos. Conta nova cai em "Complete seu cadastro"; conta existente entra.
  const profile = await getProfileByAuthId(data.user.id);
  if (!profile) {
    return NextResponse.redirect(new URL("/completar-cadastro", url.origin));
  }

  return NextResponse.redirect(new URL(next, url.origin));
}
