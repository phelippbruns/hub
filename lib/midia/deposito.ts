import { createClient } from "@supabase/supabase-js";
import { serverEnv, clientEnv } from "@/lib/env";
import { prepararImagem, type ImagemLimpa } from "./imagem";

/**
 * Guardar e servir as imagens do Hub (regra de segurança 7).
 *
 * O depósito é **privado**: nada nele é alcançável por endereço direto. A
 * tela recebe uma URL assinada de validade curta, gerada na hora de
 * desenhar. Isso custa uma assinatura por imagem exibida, e compra que uma
 * resposta apagada pare mesmo de ser vista.
 *
 * Quem fala com o depósito é só o servidor, com a chave de serviço, **depois**
 * de a camada lib/data/ conferir a permissão. O navegador não tem caminho
 * até aqui, e é isso que garante que nenhuma imagem entra sem passar pela
 * limpeza.
 */

const DEPOSITO = "imagens";

/** Dez minutos. Tempo de ver a página, não de guardar o endereço. */
const VALIDADE_DA_ASSINATURA = 600;

function cliente() {
  const servidor = serverEnv();
  const navegador = clientEnv();

  return createClient(navegador.NEXT_PUBLIC_SUPABASE_URL, servidor.SUPABASE_SECRET_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/**
 * Confere, limpa e guarda. Devolve o **caminho**, não um endereço.
 *
 * Guardar o caminho, e não uma URL, é o que permite o depósito ser privado:
 * o endereço é gerado a cada exibição e expira.
 */
export async function guardarImagem(
  bytes: Uint8Array,
  pasta: "respostas" | "capas" | "perfis",
): Promise<string> {
  const limpa: ImagemLimpa = prepararImagem(bytes);

  const caminho = `${pasta}/${crypto.randomUUID()}.${limpa.extensao}`;

  const { error } = await cliente()
    .storage.from(DEPOSITO)
    .upload(caminho, limpa.bytes, { contentType: limpa.tipo, upsert: false });

  if (error) {
    // Sem o nome do arquivo nem o id de quem enviou (regra de segurança 10).
    console.error("[imagem] o depósito recusou", { message: error.message });
    throw new Error("Não foi possível guardar a imagem. Tente de novo.");
  }

  return caminho;
}

/**
 * O endereço temporário de uma imagem guardada.
 *
 * Devolve `null` em vez de lançar: uma imagem que sumiu não pode derrubar a
 * página inteira de um tópico.
 */
export async function enderecoAssinado(caminho: string | null): Promise<string | null> {
  if (!caminho) return null;

  const { data, error } = await cliente()
    .storage.from(DEPOSITO)
    .createSignedUrl(caminho, VALIDADE_DA_ASSINATURA);

  if (error || !data) {
    console.error("[imagem] não consegui assinar", { message: error?.message });
    return null;
  }
  return data.signedUrl;
}

/**
 * O endereço de uma capa, que pode ser caminho no depósito **ou** uma URL.
 *
 * As capas enviadas viram caminho; a capa padrão de um Universo pode ser uma
 * URL externa. Quem lê a lista não deveria precisar saber qual é qual.
 */
export async function enderecoDeCapa(valor: string | null): Promise<string | null> {
  if (!valor) return null;
  if (/^https?:\/\//i.test(valor)) return valor;
  return enderecoAssinado(valor);
}

/** Vários de uma vez, para uma lista de respostas não fazer N chamadas em fila. */
export async function enderecosAssinados(caminhos: (string | null)[]): Promise<(string | null)[]> {
  return Promise.all(caminhos.map((caminho) => enderecoAssinado(caminho)));
}

/**
 * Apaga do depósito.
 *
 * Usado ao trocar a capa de uma comunidade: guardar a imagem que ninguém mais
 * vê custa espaço e aumenta o que vaza se algo der errado.
 *
 * Falhar aqui não derruba a operação: a capa nova já está no lugar, e uma
 * imagem órfã é um problema menor do que impedir a troca.
 */
export async function apagarImagem(caminho: string | null): Promise<void> {
  if (!caminho) return;

  const { error } = await cliente().storage.from(DEPOSITO).remove([caminho]);
  if (error) console.error("[imagem] não consegui apagar a antiga", { message: error.message });
}
