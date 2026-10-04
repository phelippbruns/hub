import type { Metadata, Viewport } from "next";
import { bricolageGrotesque } from "@/design/fonts";
import { color } from "@/design/tokens";
import { RegisterServiceWorker } from "./register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hub",
  description: "Conecte-se pelo que realmente importa.",
  applicationName: "Hub",
  appleWebApp: { capable: true, title: "Hub", statusBarStyle: "default" },
};

/**
 * Toda rota renderiza por requisição.
 *
 * A Content-Security-Policy exige nonce nos scripts, e o Next só consegue
 * injetá-lo fora do prerender estático: numa rota estática os scripts saem sem
 * nonce e o navegador bloqueia todos, sem erro no build. Como quase tudo no Hub
 * é por usuário (Início, comunidades, tópicos, perfis), o prerender valeria
 * para pouca coisa — e o risco de uma tela pública quebrar calada é alto.
 *
 * Isso vale só para o HTML. JavaScript, CSS, fontes e imagens continuam
 * servidos do cache da borda.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: color.surfacePage,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={bricolageGrotesque.variable}>
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
