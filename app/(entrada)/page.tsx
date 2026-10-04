import Link from "next/link";
import { redirect } from "next/navigation";
import { LevelMark } from "@/design/components";
import { getViewer } from "@/lib/auth/session";

/**
 * Tela 1: a porta do Hub.
 *
 * Marca, as três marcas de nível, a frase e os dois caminhos. Na web, marca e
 * frase no centro e os botões embaixo.
 */
export default async function TelaInicial() {
  // Quem já entrou não precisa ver a porta.
  const viewer = await getViewer();
  if (viewer.kind === "member") redirect("/inicio");

  return (
    <main className="flex flex-1 flex-col items-center justify-between gap-4 py-4 text-center">
      <div className="flex flex-1 flex-col items-center justify-center gap-3">
        <div className="flex justify-center gap-2">
          <LevelMark level="universe" />
          <LevelMark level="community" />
          <LevelMark level="topic" />
        </div>

        {/* A marca é maior que qualquer estilo do sistema: é a assinatura da
            tela de abertura, e só aparece aqui. */}
        <p className="text-ink text-brand">Hub</p>

        <p className="text-subtitle text-ink">Conecte-se pelo que realmente importa.</p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Link
          href="/criar-conta"
          className="rounded-pill bg-ink text-paper text-bodyStrong border-ink box-border border-2 px-3 py-2 font-semibold"
        >
          Criar conta
        </Link>
        <Link
          href="/entrar"
          className="rounded-pill text-ink text-bodyStrong border-ink box-border border-2 px-3 py-2 font-semibold"
        >
          Entrar
        </Link>
        <Link href="/termos" className="text-caption text-inkMuted underline">
          Termos e privacidade
        </Link>
      </div>
    </main>
  );
}
