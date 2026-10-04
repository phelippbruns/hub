import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NovaSenhaForm } from "@/features/autenticacao/senha-forms";
import { BackIcon } from "@/design/icons";

export const metadata: Metadata = { title: "Recuperar senha · Hub" };

export default async function NovaSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;
  // Sem email não há o que confirmar: volta ao começo em vez de mostrar um
  // formulário que não tem como funcionar.
  if (!email) redirect("/senha");

  return (
    <main className="flex flex-col gap-4 py-4">
      <header className="flex items-center gap-2">
        <Link href="/senha" aria-label="Voltar">
          <BackIcon decorative className="size-icon" />
        </Link>
        <h1 className="text-title text-ink">Recuperar senha</h1>
      </header>
      <NovaSenhaForm email={email} />
    </main>
  );
}
