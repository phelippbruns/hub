"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/design/components";
import { safeDestination } from "@/lib/auth/redirect";

/**
 * Continuar com Google.
 *
 * Só é renderizado quando o provedor está configurado — ver lib/auth/google.ts.
 * O destino passa pelo `safeDestination` antes de virar parâmetro, para o
 * retorno não poder ser apontado para fora do Hub.
 */
export function GoogleButton({ next }: { next?: string }) {
  async function signIn() {
    const supabase = createClient();
    const destination = safeDestination(next);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(destination)}`,
      },
    });
  }

  return (
    <Button variant="secondary" onClick={signIn} className="w-full">
      Continuar com Google
    </Button>
  );
}
