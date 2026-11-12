import { EmptyState, PostRow, SectionTitle } from "@/design/components";
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
export function AbaBlog({ posts, souEu }: { posts: PostNaLista[]; souEu: boolean }) {
  if (posts.length === 0) {
    return (
      <EmptyState
        title="Nenhum post ainda"
        description={
          souEu
            ? "Escreva o primeiro: o blog é o que você pensa, não o que você responde."
            : "Quando esta pessoa escrever, os posts aparecem aqui."
        }
      />
    );
  }

  const fixados = posts.filter((post) => post.fixado);
  const demais = posts.filter((post) => !post.fixado);

  return (
    <div className="flex flex-col gap-3">
      {fixados.length > 0 ? (
        <>
          <SectionTitle>Fixados</SectionTitle>
          <div className="flex flex-col gap-2">
            {fixados.map((post) => (
              <Linha key={post.id} post={post} souEu={souEu} />
            ))}
          </div>
          {demais.length > 0 ? <SectionTitle>Todos os posts</SectionTitle> : null}
        </>
      ) : null}

      <div className="flex flex-col gap-2">
        {demais.map((post) => (
          <Linha key={post.id} post={post} souEu={souEu} />
        ))}
      </div>
    </div>
  );
}

function Linha({ post, souEu }: { post: PostNaLista; souEu: boolean }) {
  return (
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
    />
  );
}
