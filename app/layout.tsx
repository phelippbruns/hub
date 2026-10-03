import type { Metadata, Viewport } from "next";
import { RegisterServiceWorker } from "./register-sw";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hub",
  description: "Conecte-se pelo que realmente importa.",
  applicationName: "Hub",
  appleWebApp: { capable: true, title: "Hub", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  // surfacePage, de docs/design-system/tokens.json.
  themeColor: "#F1EEFF",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR">
      <body>
        {children}
        <RegisterServiceWorker />
      </body>
    </html>
  );
}
