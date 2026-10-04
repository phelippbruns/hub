/**
 * Disponibilidade do login com Google.
 *
 * Sem credencial configurada, o botão não aparece — em vez de aparecer e dar
 * erro na cara da pessoa. O fluxo inteiro está escrito e liga sozinho quando
 * as variáveis chegarem.
 *
 * Para habilitar: criar um OAuth Client no Google Cloud Console e definir
 * SUPABASE_AUTH_GOOGLE_CLIENT_ID e SUPABASE_AUTH_GOOGLE_SECRET, que o
 * supabase/config.toml lê.
 */
export function isGoogleEnabled(): boolean {
  return (process.env.NEXT_PUBLIC_GOOGLE_SIGN_IN_ENABLED ?? "") === "true";
}
