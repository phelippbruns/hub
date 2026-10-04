import type { Metadata } from "next";
import Link from "next/link";
import { PedirCodigoForm } from "@/features/autenticacao/senha-forms";
import { BackIcon } from "@/design/icons";

export const metadata: Metadata = { title: "Recuperar senha · Hub" };

export default function PedirCodigoPage() {
  return (
    <main className="flex flex-col gap-4 py-4">
      <header className="flex items-center gap-2">
        <Link href="/entrar" aria-label="Voltar">
          <BackIcon decorative className="size-icon" />
        </Link>
        <h1 className="text-title text-ink">Recuperar senha</h1>
      </header>
      <PedirCodigoForm />
    </main>
  );
}
