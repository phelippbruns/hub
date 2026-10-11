import { assertEnv } from "./lib/env";
import type { NextConfig } from "next";

// Roda durante o build: faltando variável obrigatória, o build falha aqui.
assertEnv();

/**
 * Cabeçalhos de segurança estáticos (regra de segurança 6).
 * A Content-Security-Policy fica no proxy.ts, porque depende de um nonce
 * novo a cada requisição.
 */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
];

const nextConfig: NextConfig = {
  /*
   * Enviar imagem é uma Server Action, e o Next recusa corpo acima de **1 MB**
   * por padrão — antes de o nosso código rodar. Era por isso que qualquer
   * foto de celular dava erro 500: a requisição nem chegava à conferência de
   * tipo nem à remoção da localização.
   *
   * 4,5 MB é o teto da plataforma onde o Hub roda; pedir mais aqui não
   * adiantaria, porque a requisição seria cortada antes. Por isso o limite do
   * produto (`TAMANHO_MAXIMO`) é 4 MB, com folga para o que o envio carrega
   * além da imagem.
   */
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  images: {
    // Fotos de perfil vindas do Google (F03). Lista fechada: qualquer outro
    // domínio é recusado, para o otimizador não virar proxy aberto de imagem.
    remotePatterns: [{ protocol: "https", hostname: "lh3.googleusercontent.com" }],
  },

  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
