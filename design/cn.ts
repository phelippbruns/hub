/** Junta classes, ignorando o que for falso. Sem dependência externa. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
