import type { Metadata } from "next";
import { DesignGallery } from "@/design/gallery";

/**
 * Tela interna de conferência visual do design system.
 *
 * Reproduz a tela 29 do protótipo (Estados do sistema) e mostra todo o resto:
 * tokens, ícones, marcas de nível e componentes. Não é tela de produto — serve
 * para olhar e comparar com docs/telas.html.
 */
export const metadata: Metadata = {
  title: "Design system · Hub",
  description: "Conferência visual dos tokens, ícones e componentes do Hub.",
  robots: { index: false, follow: false },
};

export default function DesignPage() {
  return <DesignGallery />;
}

export const dynamic = "force-dynamic";
