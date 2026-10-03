import { Bricolage_Grotesque } from "next/font/google";

/**
 * Bricolage Grotesque é a única família do Hub (docs/design-system/README.md).
 * Pesos: 800 em title e question, 700 em subtitle, 400 a 600 em texto.
 *
 * O next/font baixa e serve a fonte do próprio domínio, então não há requisição
 * ao Google Fonts em runtime — bom para privacidade e para a CSP.
 */
export const bricolageGrotesque = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
  variable: "--hub-font-sans",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});
