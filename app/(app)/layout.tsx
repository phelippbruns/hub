import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AppShell, NavRail } from "@/design/components";
import { getViewer } from "@/lib/auth/session";
import { jaFezOnboarding } from "@/lib/data/onboarding";

/**
 * Layout das telas autenticadas.
 *
 * O proxy já barra quem não tem sessão antes de chegar aqui. Esta conferência
 * **fica mesmo assim**: o proxy é rápido, mas não é a fonte da verdade — ele
 * lê o cookie e o layout lê o perfil. Duas barreiras, como no RLS.
 *
 * Aqui também vive o desvio para o onboarding: sem comunidade seguida, as
 * telas de dentro não teriam conteúdo nenhum (RN19, RN31).
 */
export default async function AppLayout({
  children,
  painel,
}: {
  children: ReactNode;
  /**
   * Rota paralela: a tela que tiver painel de contexto preenche este espaço.
   * Quem não tem cai no `@painel/default.tsx`, que devolve nada.
   */
  painel: ReactNode;
}) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/");
  if (!(await jaFezOnboarding(viewer.profileId))) redirect("/boas-vindas");

  return (
    <AppShell nav={<NavRail />} painel={painel}>
      {children}
    </AppShell>
  );
}
