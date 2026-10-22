import { cn } from "../cn";
import { CLASSE_DA_FORMA } from "../forma-do-perfil";
import { caixaDaImagem, ENQUADRAMENTO_PADRAO, type Enquadramento } from "@/lib/midia/enquadramento";

/**
 * A foto de uma pessoa, no formato do Hub (RN30).
 *
 * Existe porque o mesmo bloco estava copiado em sete telas — e o hexágono
 * obrigaria a corrigir as sete. Agora a forma, o enquadramento e o avatar
 * padrão são uma decisão só.
 *
 * **O recorte é feito aqui, na hora de desenhar.** A imagem é guardada
 * inteira; o que o perfil guarda é a posição e o tamanho com que ela aparece
 * dentro do quadro. Como tudo isso é fração do lado, e não pixel, o mesmo
 * enquadramento vale em todos os tamanhos — o rosto fica no mesmo lugar na
 * lista de 30 px e no topo de 100 px.
 *
 * Sem foto, as iniciais em paper sobre ink, na mesma forma: o avatar padrão
 * não pode ser a única coisa redonda numa tela de hexágonos.
 */
export type TamanhoDeAvatar = "sm" | "md" | "lg" | "xl" | "perfil";

const tamanhos: Record<TamanhoDeAvatar, string> = {
  sm: "size-avatar text-caption",
  md: "size-avatarSm text-caption",
  lg: "size-avatarMd text-label",
  xl: "size-avatarLg text-subtitle",
  perfil: "size-avatarPerfil text-title",
};

export function Avatar({
  nome,
  url,
  tamanho = "lg",
  enquadramento = ENQUADRAMENTO_PADRAO,
  medidas,
  rotulo,
  className,
}: {
  /** De onde saem as iniciais quando não há foto. */
  nome: string;
  /** Endereço já assinado. `null` mostra as iniciais. */
  url?: string | null;
  tamanho?: TamanhoDeAvatar;
  enquadramento?: Enquadramento;
  /** Medidas da imagem original. Sem elas a foto fica centralizada e sem zoom. */
  medidas?: { largura: number; altura: number } | null;
  /**
   * Texto para o leitor de tela. **Omitir é o certo quase sempre**: o nome
   * aparece ao lado em toda tela do Hub, e anunciá-lo duas vezes atrapalha.
   */
  rotulo?: string;
  className?: string;
}) {
  const acessibilidade = rotulo
    ? ({ role: "img", "aria-label": rotulo } as const)
    : ({ "aria-hidden": true } as const);

  return (
    <span
      {...acessibilidade}
      className={cn(
        CLASSE_DA_FORMA,
        "bg-ink text-paper relative grid shrink-0 place-items-center overflow-hidden font-extrabold",
        tamanhos[tamanho],
        className,
      )}
    >
      {url ? (
        <FotoEnquadrada url={url} enquadramento={enquadramento} medidas={medidas} />
      ) : (
        iniciais(nome)
      )}
    </span>
  );
}

/**
 * A imagem posicionada dentro do quadro.
 *
 * As medidas saem em **porcentagem do quadro**, nunca em pixel: é o que faz
 * o mesmo enquadramento servir a qualquer tamanho sem a conta ser refeita.
 * Sem as proporções da imagem, não dá para calcular nada — aí `object-cover`
 * centraliza, que é o comportamento de antes e nunca deixa buraco.
 */
function FotoEnquadrada({
  url,
  enquadramento,
  medidas,
}: {
  url: string;
  enquadramento: Enquadramento;
  medidas?: { largura: number; altura: number } | null;
}) {
  if (!medidas) {
    // eslint-disable-next-line @next/next/no-img-element -- endereço assinado de validade curta: o otimizador do Next não o alcança.
    return <img src={url} alt="" className="absolute inset-0 size-full object-cover" />;
  }

  const caixa = caixaDaImagem(medidas, enquadramento);
  const pct = (valor: number) => `${valor * 100}%`;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- idem
    <img
      src={url}
      alt=""
      className="absolute max-w-none"
      style={{
        width: pct(caixa.largura),
        height: pct(caixa.altura),
        left: pct(caixa.esquerda),
        top: pct(caixa.topo),
      }}
    />
  );
}

/**
 * Até duas iniciais, do primeiro e do último nome.
 *
 * Nome de uma palavra dá uma letra só, e isso é melhor do que duas letras da
 * mesma palavra: "Jo" a partir de "Joana" parece um apelido que ninguém deu.
 */
function iniciais(nome: string): string {
  const partes = nome.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";

  const primeira = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes.at(-1)?.[0] ?? "") : "";

  return (primeira + ultima).toUpperCase();
}
