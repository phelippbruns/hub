import type { Metadata } from "next";
import { Button, ContentColumn, PageTitle, SectionTitle } from "@/design/components";
import { sair } from "@/features/autenticacao/actions";
import { QuemPodeMeConvidar } from "@/features/cabines/quem-pode-me-convidar";
import { getViewer } from "@/lib/auth/session";
import { quemPodeMeConvidar } from "@/lib/data/profiles";

export const metadata: Metadata = { title: "Configurações · Hub" };

/**
 * A tela de Configurações chega inteira na F17 — exportar dados, excluir
 * conta, preferências.
 *
 * O botão de sair mudou-se para cá na F11. Ele morava no Início desde a F05
 * porque não havia outro lugar, e o Início é a primeira tela que alguém vê:
 * não é lugar de um botão que encerra a sessão.
 */
export default async function ConfiguracoesPage() {
  const viewer = await getViewer();
  const politica = await quemPodeMeConvidar(viewer);

  return (
    <ContentColumn>
      <PageTitle>Configurações</PageTitle>

      <SectionTitle>Conta</SectionTitle>
      <form action={sair}>
        <Button type="submit" variant="secondary">
          Sair
        </Button>
      </form>

      {/*
        RN23: cada pessoa define quem pode convidá-la para uma Cabine.
        Entrou na F13, junto com a Cabine — a regra já era respeitada no
        servidor desde a F02, mas não havia como mudá-la.
      */}
      <SectionTitle>Privacidade</SectionTitle>
      <QuemPodeMeConvidar atual={politica} />

      <p className="text-caption text-inkMuted">
        Exportar seus dados, excluir a conta e as preferências de notificação chegam na F17.
      </p>
    </ContentColumn>
  );
}
