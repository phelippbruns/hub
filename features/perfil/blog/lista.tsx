import Link from "next/link";
import { EmptyState, PostRow, SectionTitle } from "@/design/components";
import { enderecoDoPost } from "@/lib/rotas";
import { CriarPost } from "./criar";
import { haQuantoTempo } from "@/lib/tempo";
import type { PostNaLista } from "@/lib/data/blog";

/**
 * A aba Blog do perfil (RN39).
 *
 * **Mora em `features/perfil/` e não numa feature própria** por causa da
 * regra do projeto: uma feature não importa de outra. O blog é desenhado
 * dentro da tela de perfil, então uma pasta `features/blog/` obrigaria
 * `features/perfil/tela.tsx` a importar dela. E a escolha também é honesta
 * sobre o produto: o blog não tem tela própria — ele é uma aba do perfil, e
 * o endereço canônico do post só redireciona para cá.
 *
 * **Os fixados ganham seção própria com título**, e não só um selo na
 * linha. Sem o título, três posts fixados no topo pareceriam os três mais
 * recentes, e a pessoa que fixou um post de setembro veria a lista
 * "mentindo" a ordem.
 *
 * A seção "Todos os posts" só aparece quando há fixados: sem eles, o título
 * nomearia a única lista da tela, que é ruído.
 */
export function AbaBlog({
  posts,
  souEu,
  base,
  handle,
  gifLigado,
  aberto,
}: {
  posts: PostNaLista[];
  souEu: boolean;
  /** O endereço desta tela: `/perfil` ou `/<handle>`. */
  base: string;
  handle: string;
  /** Sem a chave do GIPHY, o botão de GIF simplesmente não aparece. */
  gifLigado: boolean;
  /** O endereço do post aberto no painel, para destacar a linha. */
  aberto?: string;
}) {
  /* Só o dono escreve, então só ele vê a barra com o botão. */
  const barra = souEu ? (
    <div className="flex items-center justify-between gap-2">
      <span className="text-caption text-inkMuted">
        {posts.length} {posts.length === 1 ? "post" : "posts"}
      </span>
      <CriarPost handle={handle} base={base} gifLigado={gifLigado} />
    </div>
  ) : null;

  if (posts.length === 0) {
    return (
      <div className="flex flex-col gap-3">
        {barra}
        <EmptyState
          title="Nenhum post ainda"
          description={
            souEu
              ? "Escreva o primeiro: o blog é o que você pensa, não o que você responde."
              : "Quando esta pessoa escrever, os posts aparecem aqui."
          }
        />
      </div>
    );
  }

  const fixados = posts.filter((post) => post.fixado);
  const demais = posts.filter((post) => !post.fixado);

  return (
    <div className="flex flex-col gap-3">
      {barra}

      {fixados.length > 0 ? (
        <>
          <SectionTitle>Fixados</SectionTitle>
          <div className="flex flex-col gap-2">
            {fixados.map((post) => (
              <Linha key={post.id} post={post} souEu={souEu} base={base} aberto={aberto} />
            ))}
          </div>
          {demais.length > 0 ? <SectionTitle>Todos os posts</SectionTitle> : null}
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        {demais.map((post) => (
          <Linha key={post.id} post={post} souEu={souEu} base={base} aberto={aberto} />
        ))}
      </div>
    </div>
  );
}

function Linha({
  post,
  souEu,
  base,
  aberto,
}: {
  post: PostNaLista;
  souEu: boolean;
  base: string;
  aberto?: string;
}) {
  return (
    /*
      `data-post` é o que o painel procura para devolver o foco ao fechar.
      Pelo id não serviria: quem fecha é o painel, e ele sabe o endereço.
    */
    <Link
      href={enderecoDoPost(base, post.slug)}
      data-post={post.slug}
      scroll={false}
      replace={aberto !== undefined}
      className="block"
    >
      <PostRow
        titulo={post.titulo}
        resumo={post.resumo}
        minutos={post.minutos}
        quando={haQuantoTempo(post.quando)}
        fixado={post.fixado}
        comGif={post.comGif}
        // RN39: o selo de Círculo é informação do dono sobre o próprio post.
        somenteCirculo={souEu && post.somenteCirculo}
        previa={post.previa}
        imagens={post.imagens}
        aberto={aberto === post.slug}
      />
    </Link>
  );
}
