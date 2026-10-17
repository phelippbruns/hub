import Link from "next/link";
import { pedacosMarcados } from "@/lib/texto/marcacoes";

export type MarcacoesDoTexto = {
  pessoas: string[];
  comunidades: string[];
  topicos: string[];
};

/**
 * Texto de usuário com `@`, `#` e `*` virando link.
 *
 * `existentes` vem do servidor, já conferido no banco. O que não está na
 * lista fica **texto comum**: um sinal apontando para nada não pode virar
 * link quebrado, e o Hub não deve inventar que aquilo existe.
 *
 * Continua sendo texto, nunca HTML vindo de quem escreveu (regra de
 * segurança 8): o que sai daqui são `<span>` e `<Link>` montados por nós, e
 * o conteúdo entra como filho de elemento React, que o React escapa.
 */
export function TextoMarcado({
  texto,
  existentes,
  comunidade,
}: {
  texto: string;
  existentes: MarcacoesDoTexto;
  /**
   * A comunidade onde este texto vive, para montar o endereço dos tópicos
   * marcados com `*` — o endereço de tópico é único por comunidade.
   */
  comunidade?: string;
}) {
  const pedacos = pedacosMarcados(texto, {
    pessoas: new Set(existentes.pessoas),
    comunidades: new Set(existentes.comunidades),
    topicos: new Set(existentes.topicos),
  });

  return (
    <>
      {pedacos.map((pedaco, i) =>
        pedaco.tipo === "texto" ? (
          <span key={i}>{pedaco.valor}</span>
        ) : (
          <Link
            key={i}
            href={enderecoDe(pedaco.marcacao, pedaco.alvo, comunidade)}
            className="text-ink font-semibold"
          >
            {pedaco.trecho}
          </Link>
        ),
      )}
    </>
  );
}

/** Cada sinal abre o endereço do que ele marca. */
function enderecoDe(tipo: string, alvo: string, comunidade?: string): string {
  switch (tipo) {
    case "comunidade":
      return `/c/${alvo}`;
    case "topico":
      return `/c/${comunidade}/${alvo}`;
    default:
      return `/${alvo}`;
  }
}
