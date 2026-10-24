import type { Metadata } from "next";
import Link from "next/link";
import { Button, ContentColumn, PageTitle, SectionTitle } from "@/design/components";
import { sair } from "@/features/autenticacao/actions";
import { QuemPodeMeConvidar } from "@/features/cabines/quem-pode-me-convidar";
import { getViewer } from "@/lib/auth/session";
import { preferenciasDeNotificacao, quemPodeMeConvidar } from "@/lib/data/profiles";
import { PreferenciasDeNotificacao } from "@/features/notificacoes/preferencias";

export const metadata: Metadata = { title: "Configurações · Hub" };

/**
 * Configurações.
 *
 * **Sair é a última coisa da tela**, e pequeno. Ele abria a página numa
 * seção "Conta" só dele, em tamanho de ação principal: a primeira coisa
 * que alguém via ao abrir as Configurações era o botão de ir embora. A
 * seção sumiu junto — um título para um botão só é moldura em volta de
 * nada, e o resto da conta chega na F17.
 *
 * Exportar dados e excluir conta chegam na F17. Notificação no aparelho,
 * com o app instalado, vem logo depois desta.
 */
export default async function ConfiguracoesPage() {
  const viewer = await getViewer();
  const [politica, preferencias] = await Promise.all([
    quemPodeMeConvidar(viewer),
    preferenciasDeNotificacao(viewer),
  ]);

  return (
    <ContentColumn>
      <PageTitle>Configurações</PageTitle>

      {/*
        RN23: cada pessoa define quem pode convidá-la para uma Cabine.
        Entrou na F13, junto com a Cabine — a regra já era respeitada no
        servidor desde a F02, mas não havia como mudá-la.
      */}
      <SectionTitle>Privacidade</SectionTitle>
      <QuemPodeMeConvidar atual={politica} />

      {/*
        O atalho para os Termos mora aqui porque é aqui que alguém procura.
        A página existe desde a F03, mas só era alcançável da tela de
        entrada: quem já tinha conta não chegava nela por lugar nenhum.
      */}
      <Link href="/termos" className="text-bodyStrong text-ink underline underline-offset-2">
        Termos de uso e Política de privacidade
      </Link>

      {/* RN34: cada tipo tem um interruptor, e ele vale na hora de criar. */}
      <SectionTitle>Notificações</SectionTitle>
      <PreferenciasDeNotificacao atuais={preferencias} />

      <p className="text-caption text-inkMuted">
        Exportar seus dados e excluir a conta chegam na F17. Notificação no aparelho, com o app
        instalado, vem logo depois desta.
      </p>

      {/* O fio separa a saída do resto: é a única ação sem volta aqui. */}
      <form action={sair} className="border-line mt-3 border-t pt-3">
        <Button type="submit" variant="secondary" size="sm">
          Sair
        </Button>
      </form>
    </ContentColumn>
  );
}
