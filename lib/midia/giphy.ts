import { serverEnv } from "@/lib/env";

/**
 * Busca de GIFs no GIPHY (RN13, RN25).
 *
 * **A chave nunca sai do servidor** (regra de segurança 3). Os SDKs do GIPHY
 * rodam no aparelho e levam a chave junto; qualquer pessoa abriria as
 * ferramentas do navegador e a copiaria. Por isso usamos a API HTTP, chamada
 * daqui, e a tela conversa com uma rota nossa.
 *
 * **Classificação restrita.** `rating=g` é a mais restritiva do GIPHY: nada
 * de sugestivo, violento ou de linguagem forte. O Hub tem gente de 18 anos
 * recém-feitos e conversas sobre interesses pessoais; um GIF impróprio
 * aparecendo numa busca inocente é o tipo de coisa que faz alguém sair.
 */

const CLASSIFICACAO = "g";
const QUANTOS = 24;

export type GifEncontrado = {
  id: string;
  /** O arquivo que a resposta vai guardar. */
  url: string;
  /** Uma versão leve, só para a grade de escolha. */
  previa: string;
  /** O GIPHY exige descrição acessível; sem ela o alt fica vazio. */
  descricao: string;
  largura: number;
  altura: number;
};

type RespostaDoGiphy = {
  data?: {
    id?: string;
    title?: string;
    alt_text?: string;
    images?: {
      downsized?: { url?: string; width?: string; height?: string };
      fixed_width_small?: { url?: string };
    };
  }[];
};

export function gifEstaLigado(): boolean {
  return Boolean(serverEnv().GIPHY_API_KEY);
}

/**
 * Procura GIFs. Termo em branco traz os em alta.
 *
 * A chave vem por argumento, e não de `serverEnv()` aqui dentro: assim esta
 * função não depende do ambiente inteiro estar montado, e dá para testá-la
 * de verdade — inclusive provar que a classificação restrita sempre vai
 * junto.
 *
 * Devolve lista vazia em vez de lançar quando o GIPHY falha: o campo de
 * resposta continua funcionando sem GIF, e derrubar a tela inteira por causa
 * de um serviço de terceiro seria desproporcional.
 */
export async function procurarGifs(
  termo: string,
  chave: string | undefined,
): Promise<GifEncontrado[]> {
  if (!chave) return [];

  const busca = termo.trim();
  const endereco = new URL(
    busca ? "https://api.giphy.com/v1/gifs/search" : "https://api.giphy.com/v1/gifs/trending",
  );
  endereco.searchParams.set("api_key", chave);
  endereco.searchParams.set("limit", String(QUANTOS));
  endereco.searchParams.set("rating", CLASSIFICACAO);
  endereco.searchParams.set("lang", "pt");
  if (busca) endereco.searchParams.set("q", busca);

  try {
    const resposta = await fetch(endereco, {
      // O catálogo muda devagar; cinco minutos poupam chamadas sem envelhecer.
      next: { revalidate: 300 },
    });
    if (!resposta.ok) {
      // Sem o endereço: ele carrega a chave (regra de segurança 10).
      console.error("[giphy] recusou a busca", { status: resposta.status });
      return [];
    }

    const corpo = (await resposta.json()) as RespostaDoGiphy;

    return (corpo.data ?? []).flatMap((item) => {
      const cheio = item.images?.downsized;
      const previa = item.images?.fixed_width_small?.url ?? cheio?.url;
      if (!item.id || !cheio?.url || !previa) return [];

      return [
        {
          id: item.id,
          url: cheio.url,
          previa,
          descricao: item.alt_text?.trim() || item.title?.trim() || "GIF",
          largura: Number(cheio.width ?? 0),
          altura: Number(cheio.height ?? 0),
        },
      ];
    });
  } catch (erro) {
    console.error("[giphy] não respondeu", { message: (erro as Error).message });
    return [];
  }
}
