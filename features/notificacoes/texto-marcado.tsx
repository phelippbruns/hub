import Link from "next/link";
import { pedacosMarcados } from "@/lib/texto/marcacoes";
import { enderecoDaComunidade, enderecoDoTopico } from "@/lib/rotas";

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
          (() => {
            const destino = enderecoDe(pedaco.marcacao, pedaco.alvo, comunidade);
            /*
             * Sem destino, continua texto. É a promessa do analisador de
             * marcações: **o que não existe não vira link quebrado** — e
             * um `href=""` apontaria para a própria página, que é a pior
             * das duas saídas.
             */
            return destino === null ? (
              <span key={i}>{pedaco.trecho}</span>
            ) : (
              <Link key={i} href={destino} className="text-ink font-semibold">
                {pedaco.trecho}
              </Link>
            );
          })()
        ),
      )}
    </>
  );
}

/** Cada sinal abre o endereço do que ele marca. */
function enderecoDe(tipo: string, alvo: string, comunidade?: string): string | null {
  switch (tipo) {
    case "comunidade":
      return enderecoDaComunidade(alvo);
    case "topico":
      /*
       * Sem comunidade não há endereço de tópico: o `*` resolve **dentro**
       * da comunidade onde o texto está, e o slug é único só ali. O texto
       * fica texto, que é a promessa do analisador de marcações.
       */
      return comunidade ? enderecoDoTopico(comunidade, alvo) : null;
    default:
      return `/${alvo}`;
  }
}
