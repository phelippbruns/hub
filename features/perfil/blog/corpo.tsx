import { haQuantoTempo } from "@/lib/tempo";
import type { PostAberto } from "@/lib/data/blog";
import { DocumentoDoPost } from "./documento";
import { ConversarSobreOPost } from "./cabine";

/**
 * O miolo do post dentro do painel: capa, título, contexto e o texto.
 *
 * É Server Component de propósito — o corpo é desenhado no servidor, a
 * partir do JSON validado, e nenhuma string de HTML atravessa a fronteira
 * (regra de segurança 8).
 */
export function CorpoDoPost({ post }: { post: PostAberto }) {
  return (
    <article className="flex flex-col gap-3">
      {post.capa ? (
        <span className="bg-lavender block aspect-[16/8] overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element -- endereço assinado, de validade curta */}
          <img src={post.capa} alt="" decoding="async" className="size-full object-cover" />
        </span>
      ) : null}

      <span className="text-caption text-inkMuted">
        {post.fixado ? "Fixado no perfil · " : null}
        {haQuantoTempo(post.quando)} · {post.minutos} min de leitura
        {post.souAutor && post.somenteCirculo ? " · só Círculo" : null}
      </span>

      {/* `wrap-anywhere`: título é texto de gente. */}
      <h1 className="text-title text-ink wrap-anywhere">{post.titulo}</h1>

      <DocumentoDoPost corpo={post.corpo} imagens={post.imagens} />

      {post.souAutor ? null : (
        <ConversarSobreOPost
          profileId={post.autor.id}
          nome={post.autor.nome}
          titulo={post.titulo}
        />
      )}
    </article>
  );
}
