import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";

/**
 * Content Security Policy com nonce (regra de segurança 6).
 *
 * A CSP fica aqui, e não em next.config.ts, porque o nonce precisa ser novo a
 * cada requisição. Os demais cabeçalhos são estáticos e ficam no next.config.
 *
 * Este arquivo é o `proxy` do Next 16 (antigo `middleware`). Ele também renova
 * a sessão do Supabase a cada requisição.
 */
function buildCsp(nonce: string, isDev: boolean): string {
  // 'unsafe-eval' é exigido pelo React Refresh. Só em desenvolvimento.
  const scriptSrc = [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`, isDev ? `'unsafe-eval'` : ""]
    .filter(Boolean)
    .join(" ");

  return [
    `default-src 'self'`,
    `script-src ${scriptSrc}`,
    // O Next injeta <style> inline para o CSS crítico; nonce não cobre todos os casos.
    `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com`,
    `font-src 'self' https://fonts.gstatic.com`,
    `img-src 'self' blob: data: https:`,
    `connect-src 'self' https://*.supabase.co wss://*.supabase.co`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    `upgrade-insecure-requests`,
  ].join("; ");
}

export async function proxy(request: NextRequest) {
  const nonce = crypto.randomUUID().replaceAll("-", "");
  const csp = buildCsp(nonce, process.env.NODE_ENV === "development");

  // O nonce vai no header da requisição para o Next aplicá-lo aos seus scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  return updateSession(request, response);
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens, que não precisam de sessão nem CSP.
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
