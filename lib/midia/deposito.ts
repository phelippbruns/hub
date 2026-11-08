import { createClient } from "@supabase/supabase-js";
import { serverEnv, clientEnv } from "@/lib/env";
import { prepararImagem, type Dimensoes, type ImagemLimpa } from "./imagem";
import { reduzirImagem } from "./reduzir";
import type { PastaDeImagem } from "./limites";

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

/** O que ficou guardado: onde, e de que tamanho depois da redução. */
export type ImagemGuardada = { caminho: string; medidas: Dimensoes };

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
 * Confere, limpa, reduz e guarda. Devolve o **caminho** e as **medidas**.
 *
 * Guardar o caminho, e não uma URL, é o que permite o depósito ser privado:
 * o endereço é gerado a cada exibição e expira.
 *
 * **Devolve as medidas porque a imagem guardada não é a que chegou.** Ela é
 * reduzida ao maior tamanho em que o Hub a desenha, então quem chama não
 * pode mais medir os bytes que enviou e gravar aquilo no banco: gravaria o
 * tamanho de um arquivo que não existe. As proporções não mudam — a
 * redução não recorta —, mas os números, sim.
 */
export async function guardarImagem(
  bytes: Uint8Array,
  pasta: PastaDeImagem,
): Promise<ImagemGuardada> {
  // A ordem é lei: conferir o tipo pelos bytes e tirar os metadados vem
  // **antes** de reprocessar. Ver `reduzir.ts`.
  const limpa: ImagemLimpa = prepararImagem(bytes);
  const reduzida = await reduzirImagem(limpa.bytes, pasta);

  const caminho = `${pasta}/${crypto.randomUUID()}.${reduzida.extensao}`;

  const { error } = await cliente()
    .storage.from(DEPOSITO)
    .upload(caminho, reduzida.bytes, { contentType: reduzida.tipo, upsert: false });

  if (error) {
    // Sem o nome do arquivo nem o id de quem enviou (regra de segurança 10).
    console.error("[imagem] o depósito recusou", { message: error.message });
    throw new Error("Não foi possível guardar a imagem. Tente de novo.");
  }

  return { caminho, medidas: reduzida.medidas };
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
 * O endereço de uma mídia, que pode ser caminho no depósito **ou** uma URL.
 *
 * O Hub guarda as duas coisas na mesma coluna: imagem enviada vira caminho,
 * GIF do GIPHY e capa padrão de Universo são endereços prontos. Quem lê a
 * lista não deveria precisar saber qual é qual — e tentar assinar uma URL
 * externa daria erro em silêncio, deixando a mídia sumir da tela.
 */
export async function enderecoDeMidia(valor: string | null): Promise<string | null> {
  if (!valor) return null;
  if (ehUrl(valor)) return valor;
  return enderecoAssinado(valor);
}

/** Endereço pronto (GIPHY, capa padrão) em vez de caminho no depósito. */
function ehUrl(valor: string): boolean {
  return /^https?:\/\//i.test(valor);
}

/**
 * Vários de uma vez, **num pedido só**.
 *
 * Assinar é uma ida à rede, não uma conta local: cada endereço era um
 * pedido ao Supabase. Uma lista de 20 membros fazia 20 — em paralelo, mas
 * 20. O depósito tem `createSignedUrls`, que assina a lista inteira numa
 * chamada, e é o que se usa aqui.
 *
 * Três cuidados que o jeito ingênuo erraria:
 *
 * 1. **URL externa não é assinada.** GIF do GIPHY e capa padrão de Universo
 *    moram na mesma coluna que os caminhos; mandá-los para o depósito daria
 *    erro e a mídia sumiria da tela.
 * 2. **O resultado volta casado pelo caminho**, não pela posição. A ordem
 *    da resposta não é promessa de ninguém, e confiar nela trocaria a foto
 *    de uma pessoa pela de outra — um defeito de privacidade, não de
 *    desenho.
 * 3. **Caminho repetido assina uma vez.** A mesma pessoa aparece várias
 *    vezes numa lista de contribuições.
 */
export async function enderecosDeMidia(valores: (string | null)[]): Promise<(string | null)[]> {
  const caminhos = [...new Set(valores.filter((v): v is string => !!v && !ehUrl(v)))];
  if (caminhos.length === 0) return valores.map((v) => (v && ehUrl(v) ? v : null));

  const assinados = new Map<string, string>();
  const { data, error } = await cliente()
    .storage.from(DEPOSITO)
    .createSignedUrls(caminhos, VALIDADE_DA_ASSINATURA);

  if (error) {
    // Sem os caminhos na mensagem (regra de segurança 10).
    console.error("[imagem] não consegui assinar o lote", { message: error.message });
  }

  for (const item of data ?? []) {
    if (item.path && item.signedUrl && !item.error) assinados.set(item.path, item.signedUrl);
  }

  return valores.map((valor) => {
    if (!valor) return null;
    if (ehUrl(valor)) return valor;
    return assinados.get(valor) ?? null;
  });
}

/** Qualquer coisa que carregue a foto de uma pessoa. */
type ComAvatar = { avatarUrl: string | null };

/**
 * A foto de uma pessoa, pronta para a tela.
 *
 * `profiles.avatar_url` guarda o **caminho** no depósito (`perfis/x.jpg`),
 * nunca um endereço. Quem entrega esse caminho cru para a tela entrega algo
 * que o navegador procura ao lado da página, não acha, e não mostra — sem
 * erro nenhum. Foi o que aconteceu da F02 à F12: a foto aparecia no perfil,
 * que assinava, e em **nenhum outro lugar**.
 *
 * Existe como função e não como lembrete porque o erro era de repetição: a
 * assinatura morava em cada chamador, então todo chamador novo podia
 * esquecer. `lib/data/avatares.db.test.ts` varre as consultas que devolvem
 * pessoas e reprova se alguma devolver caminho cru.
 */
export async function comAvatar<T extends ComAvatar | null>(pessoa: T): Promise<T> {
  if (!pessoa) return pessoa;
  return { ...pessoa, avatarUrl: await enderecoDeMidia(pessoa.avatarUrl) };
}

/**
 * Vários de uma vez, **num pedido só** — é `enderecosDeMidia` por dentro.
 *
 * Era um `Promise.all` de chamadas individuais: paralelo, mas uma ida à
 * rede por pessoa. Uma lista de 20 membros virou 1 pedido em vez de 20.
 */
export async function comAvatares<T extends ComAvatar | null>(pessoas: T[]): Promise<T[]> {
  const enderecos = await enderecosDeMidia(pessoas.map((p) => p?.avatarUrl ?? null));
  // `.at(i)` e não `enderecos[i]`: o lint do Hub barra indexar por variável.
  return pessoas.map((pessoa, i) =>
    pessoa ? { ...pessoa, avatarUrl: enderecos.at(i) ?? null } : pessoa,
  );
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
