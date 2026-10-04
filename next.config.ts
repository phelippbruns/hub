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
