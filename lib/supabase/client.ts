import { createBrowserClient } from "@supabase/ssr";
import { clientEnv } from "@/lib/env";

/** Cliente Supabase para Client Components. Usa só a chave anônima. */
export function createClient() {
  const env = clientEnv();
  return createBrowserClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
