import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LevelMark } from "@/design/components";
import { CabinNavIcon } from "@/design/icons";
import { getViewer } from "@/lib/auth/session";
import { jaFezOnboarding } from "@/lib/data/onboarding";

export const metadata: Metadata = { title: "Como o Hub funciona · Hub" };

/**
 * Tela 5, primeiro estado: "Como o Hub funciona".
 *
 * Os três passos são a cadeia do produto em miniatura — comunidade, tópico e
 * Hot Topic, Cabine — e cada um aparece com a marca do seu nível, para a
 * pessoa já associar o símbolo ao conceito antes de ver a primeira tela real.
 */
export default async function BoasVindasPage() {
  const viewer = await getViewer();
  if (viewer.kind !== "member") redirect("/entrar");
  if (await jaFezOnboarding(viewer.profileId)) redirect("/inicio");

  return (
    <main className="flex flex-1 flex-col gap-4 py-4">
      <div className="flex gap-2">
        <LevelMark level="universe" />
        <LevelMark level="community" />
        <LevelMark level="topic" />
      </div>

      <h1 className="text-title text-ink">Como o Hub funciona</h1>

      <ol className="flex flex-col gap-2">
        <li className="bg-paper flex items-center gap-2 rounded-sm p-2">
          <LevelMark level="community" />
          <span className="text-body text-ink">Entre em comunidades do que você gosta.</span>
        </li>
        <li className="bg-paper flex items-center gap-2 rounded-sm p-2">
          <LevelMark level="topic" />
          <span className="text-body text-ink">
            Responda aos tópicos. O mais respondido vira Hot Topic no dia seguinte.
          </span>
        </li>
        <li className="bg-paper flex items-center gap-2 rounded-sm p-2">
          <span aria-hidden="true" className="size-mark grid shrink-0 place-items-center">
            <CabinNavIcon decorative className="size-icon text-ink" />
          </span>
          <span className="text-body text-ink">
            Encontre pessoas pelas respostas e converse em Cabines.
          </span>
        </li>
      </ol>

      <div className="flex-1" />

      <Link
        href="/boas-vindas/comunidades"
        className="rounded-pill bg-ink text-paper text-bodyStrong border-ink box-border border-2 px-3 py-2 text-center font-semibold"
      >
        Começar
      </Link>
    </main>
  );
}
