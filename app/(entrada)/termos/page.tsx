import type { Metadata } from "next";
import Link from "next/link";
import { BackIcon } from "@/design/icons";

export const metadata: Metadata = { title: "Termos e privacidade · Hub" };

/**
 * Página curta, para o link da tela inicial não morrer. O texto completo, com
 * o resumo em linguagem simples, é da F18 (tela 28).
 */
export default function TermosPage() {
  return (
    <main className="flex flex-col gap-3 py-4">
      <header className="flex items-center gap-2">
        <Link href="/" aria-label="Voltar">
          <BackIcon decorative className="size-icon" />
        </Link>
        <h1 className="text-title text-ink">Termos e privacidade</h1>
      </header>

      <p className="text-body text-ink">
        O Hub é para maiores de 18 anos. Ao criar conta, você concorda com os Termos de uso e com a
        Política de privacidade.
      </p>
      <p className="text-caption text-inkMuted">
        O texto completo, com resumo em linguagem simples, chega junto com a tela de Termos.
      </p>
    </main>
  );
}
