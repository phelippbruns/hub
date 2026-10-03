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
