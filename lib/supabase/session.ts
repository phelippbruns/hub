import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { clientEnv } from "@/lib/env";

/**
 * Renova o token da sessão a cada requisição e copia os cookies atualizados
 * para a resposta. Sem isso a sessão expira no meio da navegação.
 */
export async function updateSession(request: NextRequest, response: NextResponse) {
  const env = clientEnv();

  const supabase = createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // Não trocar por getSession(): só getUser() revalida o token no servidor.
  await supabase.auth.getUser();

  return response;
}
