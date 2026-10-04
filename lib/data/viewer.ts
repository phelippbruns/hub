import { UnauthenticatedError } from "./errors";

/**
 * Quem está pedindo. Toda função de lib/data/ recebe isto como primeiro
 * argumento — é o que torna a conferência de permissão obrigatória por
 * construção, em vez de depender de lembrar (regra de segurança 1).
 */
export type Viewer =
  /** Visitante sem conta. Vê comunidade e tópico, nunca respostas (RN16). */
  { readonly kind: "anonymous" } | { readonly kind: "member"; readonly profileId: string };

export const anonymous: Viewer = { kind: "anonymous" };

export function viewerFor(profileId: string): Viewer {
  return { kind: "member", profileId };
}

/** Exige sessão e devolve o id. Use no início de toda escrita. */
export function requireProfileId(viewer: Viewer): string {
  if (viewer.kind !== "member") throw new UnauthenticatedError();
  return viewer.profileId;
}

export function viewerProfileId(viewer: Viewer): string | null {
  return viewer.kind === "member" ? viewer.profileId : null;
}
