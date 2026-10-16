/**
 * Quem entra sem conta, e onde.
 *
 * A lista mora aqui, e não dentro do proxy, porque **duas camadas precisam
 * dela**: o proxy decide se deixa passar, e o layout autenticado decide se
 * desenha a casca de dentro ou a de convite. Duas listas divergiriam no
 * primeiro endereço novo, e a divergência seria silenciosa — uma rota
 * passaria pelo proxy e cairia num layout que a manda embora.
 */

/**
 * Telas que existem sem conta: a entrada, a recuperação de senha, o retorno
 * do Google, os termos e a galeria do design system.
 */
export const ROTAS_PUBLICAS = [
  "/",
  "/entrar",
  "/criar-conta",
  "/completar-cadastro",
  "/senha",
  "/termos",
  "/auth",
  "/design",
] as const;

/**
 * Endereços que viram convite quando abertos sem conta (F14).
 *
 * São os que se compartilha: a comunidade e o tópico. RN16 — quem abre um
 * link sem conta vê a comunidade e o tópico, **nunca as respostas**.
 *
 * Diferente das de cima, estas têm duas caras: com sessão é a tela normal,
 * sem sessão é a tela 2. O endereço é o mesmo, e é isso que faz o link ser
 * estável quando a pessoa cria conta e volta.
 */
export const ROTAS_COMPARTILHAVEIS = ["/c"] as const;

/** `/c` casa `/c` e `/c/qualquer/coisa`, mas não `/comunidades`. */
export function ehRota(pathname: string, rota: string): boolean {
  return rota === "/" ? pathname === "/" : pathname === rota || pathname.startsWith(`${rota}/`);
}

/** Dá para abrir sem conta? */
export function ehPublica(pathname: string): boolean {
  return [...ROTAS_PUBLICAS, ...ROTAS_COMPARTILHAVEIS].some((rota) => ehRota(pathname, rota));
}

/** Sem conta, vira convite em vez de mandar a pessoa embora? */
export function ehCompartilhavel(pathname: string): boolean {
  return ROTAS_COMPARTILHAVEIS.some((rota) => ehRota(pathname, rota));
}

/**
 * O cabeçalho em que o proxy escreve o caminho pedido.
 *
 * Existe porque layout não enxerga a rota, e o layout precisa saber se está
 * desenhando uma tela de convite. O proxy **sobrescreve** este cabeçalho a
 * cada requisição: assim o navegador não consegue forjá-lo para se passar
 * por visitante numa tela de dentro.
 */
export const CABECALHO_DA_ROTA = "x-hub-rota";

/**
 * `/c/<comunidade>/<topico>` — o endereço que vira convite com retorno.
 *
 * O da comunidade também é compartilhável, mas não tem para onde devolver
 * a pessoa no fim do onboarding: ela já vai entrar na comunidade ali.
 */
export function ehCaminhoDeTopico(pathname: string): boolean {
  const partes = pathname.split("/").filter(Boolean);
  return partes.length === 3 && partes[0] === "c";
}
