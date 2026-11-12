import { Fragment, type ReactNode } from "react";

/**
 * O corpo do post, desenhado a partir do JSON do Tiptap.
 *
 * **Nenhuma string de HTML existe em momento nenhum** (regra de segurança
 * 8). O documento é percorrido e cada nó vira um elemento React, com o
 * texto como filho — e o React escapa texto por construção.
 *
 * Você pediu `isomorphic-dompurify`, e eu recomendei não usar: limpar HTML
 * é apostar que a biblioteca pensou em tudo que um navegador aceita; não
 * gerar HTML é não precisar apostar. O precedente no Hub é
 * `features/notificacoes/texto-marcado.tsx`, que monta `@`, `#` e `*` da
 * mesma forma.
 *
 * **O que não está nesta lista não é desenhado.** Nó desconhecido some em
 * silêncio, em vez de virar `<div>` genérica: a lista é fechada por
 * desenho, e o servidor já recusou o que não cabe nela antes de guardar.
 *
 * **As imagens não vêm do documento.** O corpo guarda o *caminho* no
 * depósito, que é privado; os endereços assinados chegam em `imagens`, na
 * mesma ordem em que os nós aparecem. Usar o `src` do documento desenharia
 * um caminho cru, que o navegador procura ao lado da página e não acha —
 * exatamente o defeito que a foto de perfil teve da F02 à F12.
 */
export function DocumentoDoPost({ corpo, imagens }: { corpo: unknown; imagens: string[] }) {
  const contador = { imagem: 0 };

  return <div className="flex flex-col gap-3">{filhos(corpo, imagens, contador)}</div>;
}

type Contador = { imagem: number };

type No = {
  type?: unknown;
  attrs?: Record<string, unknown>;
  content?: unknown;
  text?: unknown;
  marks?: unknown;
};

function filhos(no: unknown, imagens: string[], contador: Contador): ReactNode {
  const lista = conteudoDe(no);
  return lista.map((filho, i) => <Fragment key={i}>{desenhar(filho, imagens, contador)}</Fragment>);
}

function conteudoDe(no: unknown): No[] {
  if (Array.isArray(no)) return no as No[];
  if (!no || typeof no !== "object") return [];
  const registro = no as No;
  if (registro.type === "doc" || registro.content) {
    return Array.isArray(registro.content) ? (registro.content as No[]) : [];
  }
  return [];
}

function desenhar(no: No, imagens: string[], contador: Contador): ReactNode {
  switch (no.type) {
    case "paragraph":
      return <p className="text-body text-ink wrap-anywhere">{linha(no, imagens, contador)}</p>;

    /*
     * Um nível só de subtítulo, e sempre `h2`: o `h1` é o título do post,
     * e níveis soltos quebram a ordem de leitura de quem usa leitor de
     * tela. O editor também só oferece este.
     */
    case "heading":
      return (
        <h2 className="text-bodyStrong text-ink mt-3 wrap-anywhere">
          {linha(no, imagens, contador)}
        </h2>
      );

    case "blockquote":
      return (
        <blockquote className="border-lavender text-inkMuted border-l-4 pl-3 italic">
          {filhos(no, imagens, contador)}
        </blockquote>
      );

    case "bulletList":
      return (
        <ul className="text-body text-ink flex list-disc flex-col gap-1 pl-5">
          {filhos(no, imagens, contador)}
        </ul>
      );

    case "orderedList":
      return (
        <ol className="text-body text-ink flex list-decimal flex-col gap-1 pl-5">
          {filhos(no, imagens, contador)}
        </ol>
      );

    case "listItem":
      return <li className="wrap-anywhere">{filhos(no, imagens, contador)}</li>;

    case "image": {
      // O endereço assinado chega de fora, na ordem dos nós.
      const src = imagens.at(contador.imagem);
      contador.imagem += 1;
      if (!src) return null;
      const alt = typeof no.attrs?.alt === "string" ? no.attrs.alt : "";
      return (
        // eslint-disable-next-line @next/next/no-img-element -- endereço assinado, de validade curta
        <img src={src} alt={alt} loading="lazy" decoding="async" className="rounded-sm" />
      );
    }

    case "hardBreak":
      return <br />;

    case "text":
      return texto(no);

    default:
      return null;
  }
}

/** O conteúdo de um bloco de uma linha só (parágrafo, subtítulo). */
function linha(no: No, imagens: string[], contador: Contador): ReactNode {
  return filhos(no, imagens, contador);
}

/**
 * Um pedaço de texto, com as marcas dele.
 *
 * O link é o único que vira elemento com atributo, e por isso é o único
 * que confere: só `http` e `https` passam, e o resto do endereço fica
 * texto. Um `javascript:` aqui seria execução de código no clique.
 */
function texto(no: No): ReactNode {
  const conteudo = typeof no.text === "string" ? no.text : "";
  if (!conteudo) return null;

  const marcas = Array.isArray(no.marks) ? (no.marks as No[]) : [];
  const nomes = new Set(marcas.map((m) => m.type));

  let elemento: ReactNode = conteudo;
  if (nomes.has("bold")) elemento = <strong className="font-bold">{elemento}</strong>;
  if (nomes.has("italic")) elemento = <em className="italic">{elemento}</em>;

  const link = marcas.find((m) => m.type === "link");
  const href = typeof link?.attrs?.href === "string" ? link.attrs.href : null;

  if (href && /^https?:\/\//i.test(href)) {
    return (
      <a
        href={href}
        /*
          RN41: o post é o único texto do Hub com link, e ele sai do Hub —
          `noopener` para a página aberta não alcançar esta pelo
          `window.opener`, `nofollow` porque o Hub não endossa o destino.
        */
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="decoration-lavender underline decoration-2 underline-offset-2"
      >
        {elemento}
      </a>
    );
  }

  return elemento;
}
