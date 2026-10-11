import type { Metadata } from "next";
import { Button, ContentColumn, PageTitle, SectionTitle } from "@/design/components";
import { sair } from "@/features/autenticacao/actions";

export const metadata: Metadata = { title: "Configurações · Hub" };

/**
 * A tela de Configurações chega inteira na F17 — exportar dados, excluir
 * conta, preferências.
 *
 * O botão de sair mudou-se para cá na F11. Ele morava no Início desde a F05
 * porque não havia outro lugar, e o Início é a primeira tela que alguém vê:
 * não é lugar de um botão que encerra a sessão.
 */
export default function ConfiguracoesPage() {
  return (
    <ContentColumn>
      <PageTitle>Configurações</PageTitle>

      <SectionTitle>Conta</SectionTitle>
      <form action={sair}>
        <Button type="submit" variant="secondary">
          Sair
        </Button>
      </form>

      <p className="text-caption text-inkMuted">
        Exportar seus dados, excluir a conta e as preferências de notificação chegam na F17.
      </p>
    </ContentColumn>
  );
}
