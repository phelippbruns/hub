import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { getProfileByAuthId } from "@/lib/data/profiles";
import { anonymous, viewerFor, type Viewer } from "@/lib/data/viewer";

/**
 * Liga o Supabase Auth à camada de dados: transforma a sessão no `Viewer` que
 * toda função de lib/data/ espera.
 *
 * `cache` deduplica por requisição — vários componentes podem pedir o visitante
 * sem gerar várias idas ao Supabase e ao banco.
 */
export const getViewer = cache(async (): Promise<Viewer> => {
  const supabase = await createClient();

  // getUser(), não getSession(): só o primeiro revalida o token no servidor.
  // getSession() confia no cookie, que o navegador pode ter adulterado.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return anonymous;

  // Pessoa autenticada mas sem perfil ainda está no meio do cadastro
  // (veio do Google e não passou pelo "Complete seu cadastro"). Para a
  // aplicação, ainda não é membro.
  const profile = await getProfileByAuthId(user.id);
  if (!profile || profile.deletedAt) return anonymous;

  return viewerFor(profile.id);
});

/** O usuário do Auth, mesmo sem perfil — para o fluxo de completar cadastro. */
export const getAuthUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});
