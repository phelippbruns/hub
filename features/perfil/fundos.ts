import { fundoDePerfil, type FundoDePerfil } from "@/design/tokens";

/**
 * As cores de fundo do perfil, da chave guardada até a classe do Tailwind
 * (RN27).
 *
 * O perfil guarda a **chave** (`verde`), não o hex: assim a paleta muda
 * mexendo só no design system, sem migration. A tradução precisa ser um mapa
 * escrito à mão, e não `` `bg-fundo${Nome}` ``: o Tailwind lê as classes do
 * código-fonte e **descarta em silêncio** qualquer uma montada por
 * concatenação — a cor simplesmente não existiria no CSS, sem erro nenhum.
 *
 * Mora em `features/` e não em `lib/data/` porque o formulário é componente
 * de cliente: um reexport a partir da camada de dados arrastaria o Prisma
 * para o pacote do navegador.
 */
export type ChaveDeFundo =
  "lavanda" | "branco" | "verde" | "azul" | "vermelho" | "roxo" | "amarelo" | "preto";

export const FUNDO_PADRAO: ChaveDeFundo = "lavanda";

type Fundo = {
  chave: ChaveDeFundo;
  nome: string;
  /** Para a bolinha de escolher, que precisa do valor e não da classe. */
  valor: string;
  /** Classe de fundo da página. */
  pagina: string;
  /**
   * Classe de fundo dos cartões.
   *
   * Quase sempre `paper`. A exceção é o fundo Branco: cartão branco sobre
   * página branca tem 1,00 de contraste, ou seja, some. Ali os cartões viram
   * `surfacePage`, que é a mesma troca que o protótipo faz.
   */
  cartao: string;
};

export const FUNDOS_DO_PERFIL: Fundo[] = [
  {
    chave: "lavanda",
    nome: "Lavanda",
    valor: fundoDePerfil.fundoLavanda,
    pagina: "bg-fundoLavanda",
    cartao: "bg-paper",
  },
  {
    chave: "branco",
    nome: "Branco",
    valor: fundoDePerfil.fundoBranco,
    pagina: "bg-fundoBranco",
    cartao: "bg-surfacePage",
  },
  {
    chave: "verde",
    nome: "Verde",
    valor: fundoDePerfil.fundoVerde,
    pagina: "bg-fundoVerde",
    cartao: "bg-paper",
  },
  {
    chave: "azul",
    nome: "Azul",
    valor: fundoDePerfil.fundoAzul,
    pagina: "bg-fundoAzul",
    cartao: "bg-paper",
  },
  {
    chave: "vermelho",
    nome: "Vermelho",
    valor: fundoDePerfil.fundoVermelho,
    pagina: "bg-fundoVermelho",
    cartao: "bg-paper",
  },
  {
    chave: "roxo",
    nome: "Roxo",
    valor: fundoDePerfil.fundoRoxo,
    pagina: "bg-fundoRoxo",
    cartao: "bg-paper",
  },
  {
    chave: "amarelo",
    nome: "Amarelo",
    valor: fundoDePerfil.fundoAmarelo,
    pagina: "bg-fundoAmarelo",
    cartao: "bg-paper",
  },
  {
    chave: "preto",
    nome: "Preto",
    valor: fundoDePerfil.fundoPreto,
    pagina: "bg-fundoPreto",
    cartao: "bg-paper",
  },
];

/**
 * A cor de um perfil, pela chave guardada.
 *
 * **Chave desconhecida cai no padrão, não quebra.** Um perfil não pode
 * deixar de abrir porque a paleta mudou embaixo dele — e é justamente para
 * a paleta poder mudar que a chave é guardada em vez do hex.
 */
export function fundoDaPagina(chave: string): Fundo {
  return FUNDOS_DO_PERFIL.find((f) => f.chave === chave) ?? FUNDOS_DO_PERFIL[0]!;
}

/** As chaves existentes, para a validação do servidor. */
export const CHAVES_DE_FUNDO = FUNDOS_DO_PERFIL.map((f) => f.chave);

/** Confere, em tempo de compilação, que toda cor do design system tem entrada aqui. */
const _todasMapeadas: Record<FundoDePerfil, true> = {
  fundoLavanda: true,
  fundoBranco: true,
  fundoVerde: true,
  fundoAzul: true,
  fundoVermelho: true,
  fundoRoxo: true,
  fundoAmarelo: true,
  fundoPreto: true,
};
void _todasMapeadas;
