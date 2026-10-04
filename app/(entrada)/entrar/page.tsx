import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { EntrarForm } from "@/features/autenticacao/entrar-form";
import { getViewer } from "@/lib/auth/session";
import { isGoogleEnabled } from "@/lib/auth/google";
import { BackIcon } from "@/design/icons";

export const metadata: Metadata = { title: "Entrar · Hub" };

export default async function EntrarPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const viewer = await getViewer();
  if (viewer.kind === "member") redirect("/inicio");

  const { next } = await searchParams;

  return (
    <main className="flex flex-col gap-4 py-4">
      <header className="flex items-center gap-2">
        <Link href="/" aria-label="Voltar">
          <BackIcon decorative className="size-icon" />
        </Link>
        <h1 className="text-title text-ink">Entrar</h1>
      </header>

      <EntrarForm next={next} googleEnabled={isGoogleEnabled()} />
    </main>
  );
}
