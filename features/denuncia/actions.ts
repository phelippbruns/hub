"use server";

/**
 * Denunciar e bloquear (F16).
 *
 * Regra de segurança 5: a sessão é conferida antes de qualquer coisa, e o
 * id de quem pede vem dela — nunca do formulário. O que o formulário manda
 * é só **o que** está sendo denunciado.
 */
import { redirect } from "next/navigation";
import { getViewer } from "@/lib/auth/session";
import { UnauthenticatedError } from "@/lib/data/errors";
import { blockProfile } from "@/lib/data/cabins";
import { denunciar, type AlvoDaDenuncia } from "@/lib/data/moderacao";

const TIPOS = ["answer", "topic", "profile", "community"] as const;

function alvoDoFormulario(formulario: FormData): AlvoDaDenuncia {
  const tipo = String(formulario.get("tipo") ?? "");
  const id = String(formulario.get("id") ?? "");
  const valido = TIPOS.find((t) => t === tipo);
  if (!valido || !id) throw new Error("Alvo da denúncia inválido");
  return { tipo: valido, id };
}

export async function enviarDenuncia(formulario: FormData) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();

  await denunciar(
    viewer,
    alvoDoFormulario(formulario),
    String(formulario.get("motivo") ?? ""),
    String(formulario.get("detalhes") ?? ""),
  );

  // Volta para a tela de onde a pessoa veio, com o aviso de recebido: ficar
  // numa tela de sucesso obrigaria mais um clique para voltar ao Hub.
  const destino = destinoSeguro(formulario);
  redirect(`${destino}${destino.includes("?") ? "&" : "?"}denuncia=enviada`);
}

export async function bloquearPessoa(formulario: FormData) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();

  await blockProfile(viewer, String(formulario.get("pessoaId") ?? ""));
  const destino = destinoSeguro(formulario);
  redirect(`${destino}${destino.includes("?") ? "&" : "?"}bloqueio=feito`);
}

/**
 * Os únicos parâmetros que sobrevivem ao `voltar`.
 *
 * `t` é o tópico aberto no painel — sem ele, voltar da denúncia fecha o
 * tópico e devolve a lista da comunidade, que é justo o que o "voltar"
 * existe para impedir. `ordem` e `aba` são o estado da tela.
 *
 * Lista fechada, e não "tudo que vier": o `voltar` chega do formulário,
 * e repassar parâmetro arbitrário deixaria qualquer pessoa montar um
 * link de denúncia que termina numa tela do Hub com o que ela escolher
 * na barra de endereço.
 */
const PARAMETROS_QUE_VOLTAM = ["t", "ordem", "aba"] as const;

/**
 * Para onde voltar.
 *
 * Só caminho interno: um `voltar` vindo do formulário com endereço de fora
 * transformaria a tela de denúncia em trampolim para outro site.
 */
function destinoSeguro(formulario: FormData): string {
  const voltar = String(formulario.get("voltar") ?? "");
  if (!/^\/[^/\\]/.test(voltar)) return "/inicio";

  // `base` é descartada: só o caminho e a busca saem daqui.
  const alvo = new URL(voltar, "http://hub.invalido");
  const limpos = new URLSearchParams();
  for (const nome of PARAMETROS_QUE_VOLTAM) {
    const valor = alvo.searchParams.get(nome);
    // Valores do vocabulário do Hub: endereço, não texto livre.
    if (valor !== null && /^[A-Za-z0-9_-]{1,120}$/.test(valor)) limpos.set(nome, valor);
  }

  const busca = limpos.toString();
  return busca ? `${alvo.pathname}?${busca}` : alvo.pathname;
}
