import type { Metadata } from "next";
import { ContentColumn, PageTitle } from "@/design/components";
import { sair } from "@/features/autenticacao/actions";

export const metadata: Metadata = { title: "Início · Hub" };

/**
 * Tela 6. O conteúdo — Hot Topics, pessoas que você segue, tópicos seguidos —
 * chega na F11, que depende do ciclo (F10).
 *
 * O botão de sair fica aqui até as Configurações existirem (F17).
 */
export default function InicioPage() {
  return (
    <ContentColumn>
      <PageTitle>Início</PageTitle>
      <p className="text-body text-inkMuted">Os Hot Topics das suas comunidades chegam na F11.</p>
      <form action={sair}>
        <button
          type="submit"
          className="rounded-pill text-ink text-bodyStrong border-ink box-border border-2 px-3 py-2 font-semibold"
        >
          Sair
        </button>
      </form>
    </ContentColumn>
  );
}
