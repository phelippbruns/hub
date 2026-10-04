/**
 * Destinos permitidos no retorno do login (item 9 da F03).
 *
 * Sem isto, `?next=https://site-falso.com` faria o Hub redirecionar a pessoa
 * recém-autenticada para fora — redirecionamento aberto, que é como se rouba
 * sessão em fluxo de OAuth.
 *
 * A regra é fechada: só caminho interno, começando com uma barra e sem uma
 * segunda barra logo depois (`//outro.site` é interpretado como domínio pelo
 * navegador).
 */

export const DEFAULT_DESTINATION = "/inicio";

export function safeDestination(
  next: string | null | undefined,
  fallback: string = DEFAULT_DESTINATION,
): string {
  if (!next) return fallback;

  // `//host` e `/\host` viram URL absoluta no navegador.
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) {
    return fallback;
  }

  // `https://…` e `javascript:…` nunca começam com barra, mas uma barra
  // seguida de esquema (`/\thttps:`) escapa de checagem ingênua.
  if (/^\/[\s]*[a-z][a-z0-9+.-]*:/i.test(next)) return fallback;

  return next;
}
