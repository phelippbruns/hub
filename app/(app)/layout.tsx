import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { AppShell, NavRail } from "@/design/components";
import { getViewer } from "@/lib/auth/session";
import { CABECALHO_DA_ROTA, ehCompartilhavel } from "@/lib/auth/rotas-publicas";
import { jaFezOnboarding } from "@/lib/data/onboarding";
import { temNovidade } from "@/lib/data/inicio";
import { temCabineNova } from "@/lib/data/cabins";

/**
 * Layout das telas autenticadas — e das compartilháveis (F14).
 *
 * O proxy já barra quem não tem sessão antes de chegar aqui. Esta conferência
 * **fica mesmo assim**: o proxy é rápido, mas não é a fonte da verdade — ele
 * lê o cookie e o layout lê o perfil. Duas barreiras, como no RLS.
 *
 * Desde a F14 há um terceiro caso: `/c/...` abre sem conta e vira convite
 * (RN16). Nesse caso não há barra de navegação — não há para onde navegar —
 * e a casca é só a coluna de conteúdo.
 *
 * A rota vem do cabeçalho que o proxy **sobrescreve**, porque layout não
 * enxerga o caminho. Sobrescrever é o que impede alguém de mandar o
 * cabeçalho à mão e se passar por visitante numa tela de dentro.
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

  if (viewer.kind !== "member") {
    const rota = (await headers()).get(CABECALHO_DA_ROTA) ?? "";
    if (!ehCompartilhavel(rota)) redirect("/");

    // Sem conta, numa tela que se compartilha: a casca de convite.
    return <main className="bg-surfacePage min-h-screen">{children}</main>;
  }

  if (!(await jaFezOnboarding(viewer.profileId))) redirect("/boas-vindas");

  // Item 7 da F11: o ponto amarelo no sino quando há notificação não lida.
  const [novidade, cabineNova] = await Promise.all([temNovidade(viewer), temCabineNova(viewer)]);

  return (
    <AppShell nav={<NavRail temNovidade={novidade} temCabineNova={cabineNova} />} painel={painel}>
      {children}
    </AppShell>
  );
}
