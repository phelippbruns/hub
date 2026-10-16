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
  redirect(`${destinoSeguro(formulario)}?denuncia=enviada`);
}

export async function bloquearPessoa(formulario: FormData) {
  const viewer = await getViewer();
  if (viewer.kind !== "member") throw new UnauthenticatedError();

  await blockProfile(viewer, String(formulario.get("pessoaId") ?? ""));
  redirect(`${destinoSeguro(formulario)}?bloqueio=feito`);
}

/**
 * Para onde voltar.
 *
 * Só caminho interno: um `voltar` vindo do formulário com endereço de fora
 * transformaria a tela de denúncia em trampolim para outro site.
 */
function destinoSeguro(formulario: FormData): string {
  const voltar = String(formulario.get("voltar") ?? "");
  return /^\/[^/\\]/.test(voltar) ? voltar.split("?")[0]! : "/inicio";
}
