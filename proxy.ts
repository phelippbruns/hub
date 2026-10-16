import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";
import { CABECALHO_DA_ROTA, ehCaminhoDeTopico, ehPublica } from "@/lib/auth/rotas-publicas";
import { COOKIE_DO_CONVITE, DURACAO_DO_CONVITE } from "@/lib/auth/convite";

/**
 * Content Security Policy com nonce (regra de segurança 6).
 *
 * A CSP fica aqui, e não em next.config.ts, porque o nonce precisa ser novo a
 * cada requisição. Os demais cabeçalhos são estáticos e ficam no next.config.
 *
 * Este arquivo é o `proxy` do Next 16 (antigo `middleware`). Ele também renova
 * a sessão do Supabase a cada requisição.
 */
/**
 * De onde o navegador pode falar com o Supabase.
 *
 * Era `https://*.supabase.co wss://*.supabase.co`, chumbado. Duas coisas
 * erradas nisso:
 *
 * 1. **O Realtime da Cabine não conectava em desenvolvimento.** O Supabase
 *    local é `http://127.0.0.1:54321`, que o curinga não cobre. A CSP
 *    bloqueava o WebSocket, a assinatura falhava com "transport failure" e
 *    a mensagem simplesmente não chegava — sem nada na tela, sem erro de
 *    servidor, sem teste vermelho fora do que mede o tempo real.
 * 2. Em produção, o curinga libera **qualquer** projeto Supabase, não o
 *    nosso. Derivar do endereço configurado é mais estreito.
 *
 * O `wss` sai do mesmo endereço trocando o esquema: é a mesma origem, e é
 * por onde o Realtime fala.
 */
function origensDoSupabase(): string[] {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return [];

  try {
    const { origin, host, protocol } = new URL(url);
    const seguro = protocol === "https:";
    return [origin, `${seguro ? "wss" : "ws"}://${host}`];
  } catch {
    // Endereço malformado não derruba a requisição: o `lib/env.ts` é quem
    // recusa isso na inicialização, com mensagem clara.
    return [];
  }
}

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
    `connect-src ${[`'self'`, ...origensDoSupabase()].join(" ")}`,
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

  /*
   * O caminho pedido, para o layout saber se está desenhando uma tela de
   * convite. `set` **sobrescreve** o que vier do navegador: sem isso,
   * qualquer pessoa mandaria o cabeçalho à mão e se passaria por visitante
   * numa tela de dentro.
   */
  requestHeaders.set(CABECALHO_DA_ROTA, request.nextUrl.pathname);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);

  const comSessao = await updateSession(request, response);

  /*
   * Quem não tem sessão não entra nas telas de dentro.
   *
   * A decisão acontece aqui, antes de renderizar qualquer coisa, e num lugar
   * só — em vez de cada página lembrar de conferir. O layout autenticado
   * confere de novo: isto lê o cookie, ele lê o perfil.
   */
  if (!ehPublica(request.nextUrl.pathname)) {
    const { data } = await comSessao.supabase.auth.getUser();
    if (!data.user) {
      const destino = new URL("/", request.url);
      return NextResponse.redirect(destino);
    }
  } else if (ehCaminhoDeTopico(request.nextUrl.pathname)) {
    const { data } = await comSessao.supabase.auth.getUser();

    /*
     * Sem conta, abrindo um tópico: guarda o convite (RN31).
     *
     * Aqui, e não na página, porque gravar cookie durante a renderização
     * não é permitido no App Router — a página tentou e devolveu erro de
     * servidor. O proxy roda antes, e já está decidindo sobre sessão.
     *
     * Entre abrir o link e terminar o onboarding há um cadastro inteiro,
     * com redirecionamentos do Supabase pelo caminho: parâmetro de URL não
     * sobrevive a isso, cookie sobrevive.
     */
    if (!data.user) {
      comSessao.response.cookies.set(COOKIE_DO_CONVITE, request.nextUrl.pathname, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        path: "/",
        maxAge: DURACAO_DO_CONVITE,
      });
    }
  }

  return comSessao.response;
}

export const config = {
  matcher: [
    // Tudo, menos arquivos estáticos e imagens, que não precisam de sessão nem CSP.
    "/((?!_next/static|_next/image|favicon.ico|icons/|sw.js|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
