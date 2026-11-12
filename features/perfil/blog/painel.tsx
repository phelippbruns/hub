"use client";

import { useEffect, useId, useRef, useState, useTransition, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  AlcaDoPainel,
  Button,
  ConfirmSheet,
  MenuSuspenso,
  RoundIconButton,
} from "@/design/components";
import { CloseIcon, MoreOptionsIcon, PinIcon } from "@/design/icons";
import { COOKIE_DO_POST, LARGURA_MINIMA_DO_POST } from "./shared";
import { apagarMeuPost, fixarMeuPost } from "./actions";

/**
 * O post aberto ao lado do perfil.
 *
 * **Irmão do painel do tópico, e não o mesmo componente.** O PO decidiu em
 * 12 de novembro de 2026 que o painel do tópico não muda nesta rodada: ele
 * funciona, é a tela mais usada do Hub, e unificar os dois mexeria por
 * dentro dela. O que os dois compartilham são as peças — a alça
 * (`design/components/alca-do-painel.tsx`) e a conta da largura
 * (`lib/painel.ts`). A dívida de unificá-los está registrada.
 *
 * Por nascer agora, este corrige dois defeitos que o do tópico tem:
 *
 * 1. **Fechar preserva os outros parâmetros.** Lá o `fechar()` navega para
 *    `/c/<slug>` cru, e quem tinha uma busca ou um filtro na lista os
 *    perde. Aqui só o `?post=` sai.
 * 2. **O foco volta para a linha que estava aberta.** Lá ele cai no topo
 *    da página, e quem usa teclado perde o lugar na lista.
 */
export function PainelDoPost({
  postId,
  slug,
  titulo,
  handle,
  larguraInicial,
  souAutor,
  fixado,
  children,
}: {
  postId: string;
  slug: string;
  titulo: string;
  /** O @ de quem escreveu: é o caminho de volta ao perfil. */
  handle: string;
  /** A largura guardada no cookie, já dentro dos limites. */
  larguraInicial: number;
  souAutor: boolean;
  fixado: boolean;
  children: ReactNode;
}) {
  const router = useRouter();
  const caminho = usePathname();
  const parametros = useSearchParams();
  const [aberto, setAberto] = useState<"nenhum" | "menu" | "apagar">("nenhum");
  const [largura, setLargura] = useState(larguraInicial);
  const [pendente, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  const painel = useRef<HTMLElement>(null);
  const grupoDoMenu = useRef<HTMLDivElement>(null);

  const idDoMenu = useId();

  /**
   * Fechar tira **só** o `?post=`.
   *
   * O painel do tópico navega para o endereço cru e perde a busca e os
   * filtros da lista junto. Aqui os outros parâmetros são copiados — é a
   * mesma receita de `controles-de-topicos.tsx`, e `usePathname()` não
   * traz a busca, então ela vem de `useSearchParams()`.
   */
  function fechar() {
    const novos = new URLSearchParams(parametros.toString());
    novos.delete("post");
    const consulta = novos.toString();
    router.push(consulta ? `${caminho}?${consulta}` : caminho);
  }

  /*
   * Esc fecha o painel — e só quando não há nada aberto por cima, senão um
   * Esc fecharia o menu e o painel na mesma batida.
   */
  useEffect(() => {
    function aoTeclar(evento: KeyboardEvent) {
      if (evento.key !== "Escape") return;
      if (aberto !== "nenhum") return;
      fechar();
    }
    document.addEventListener("keydown", aoTeclar);
    return () => document.removeEventListener("keydown", aoTeclar);
    // `fechar` só usa router, caminho e parâmetros, e todos são estáveis
    // dentro de uma renderização.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aberto, caminho, parametros]);

  /*
   * O foco entra no painel ao abrir, e **volta para a linha ao fechar**.
   *
   * A volta é o que o painel do tópico não faz: lá o foco cai no topo da
   * página e quem usa teclado precisa tabular a lista inteira de novo
   * para continuar de onde estava. Aqui o alvo é a linha do post, achada
   * pelo `data-post` que a lista escreve.
   */
  useEffect(() => {
    painel.current?.focus();

    return () => {
      const linha = document.querySelector<HTMLElement>(`[data-post="${slug}"]`);
      linha?.focus();
    };
  }, [postId, slug]);

  return (
    <aside
      ref={painel}
      tabIndex={-1}
      aria-label={`Post ${titulo}`}
      /*
        A largura é inline porque é um número que muda, não um degrau da
        escala — e o teto fica no `max-width`, em `vw`, para valer já na
        primeira pintura, antes de qualquer JavaScript.
      */
      style={{ width: `${largura}px`, maxWidth: "50vw" }}
      className="bg-paper border-line sticky top-0 z-20 flex max-h-screen shrink-0 flex-col gap-3 overflow-y-auto border-l p-3"
    >
      <AlcaDoPainel
        largura={largura}
        onLargura={setLargura}
        minimo={LARGURA_MINIMA_DO_POST}
        cookie={COOKIE_DO_POST}
        rotulo="Largura do post"
      />

      <div className="flex items-start justify-between gap-2">
        <RoundIconButton label="Fechar post" tamanho="sm" onClick={fechar}>
          <CloseIcon decorative className="size-icon" />
        </RoundIconButton>

        {souAutor ? (
          <div className="relative" ref={grupoDoMenu}>
            <RoundIconButton
              label="Mais opções do post"
              tamanho="sm"
              nu
              ativo={aberto === "menu"}
              controla={idDoMenu}
              onClick={() => setAberto((a) => (a === "menu" ? "nenhum" : "menu"))}
            >
              <MoreOptionsIcon decorative className="size-icon" />
            </RoundIconButton>

            <div id={idDoMenu}>
              <MenuSuspenso
                titulo="Opções do post"
                aberto={aberto === "menu"}
                onFechar={() => setAberto("nenhum")}
                ancora={grupoDoMenu}
              >
                <Button
                  variant={fixado ? "highlight" : "secondary"}
                  size="sm"
                  disabled={pendente}
                  onClick={() => {
                    setAberto("nenhum");
                    setErro(null);
                    iniciar(async () => {
                      const resultado = await fixarMeuPost(postId, handle, !fixado);
                      // RN39: o quarto fixado volta com a frase, e ela
                      // precisa aparecer — senão o clique não faz nada e
                      // ninguém entende por quê.
                      if (resultado?.erro) setErro(resultado.erro);
                    });
                  }}
                >
                  <PinIcon decorative className="size-iconSm" />
                  {fixado ? "Desafixar" : "Fixar no perfil"}
                </Button>
                <p className="text-caption text-inkMuted">
                  Posts fixados aparecem no topo do seu blog. Cabem três.
                </p>

                <Button variant="danger" size="sm" onClick={() => setAberto("apagar")}>
                  Apagar post
                </Button>
              </MenuSuspenso>
            </div>
          </div>
        ) : null}
      </div>

      {erro ? (
        <p role="alert" className="text-caption text-error">
          {erro}
        </p>
      ) : null}

      {children}

      <ConfirmSheet
        open={aberto === "apagar"}
        titulo="Apagar post?"
        descricao={`“${titulo}” sai do seu blog, e o endereço dele deixa de abrir. Isso não pode ser desfeito.`}
        confirmar="Apagar"
        pendente={pendente}
        onConfirm={() => iniciar(() => apagarMeuPost(postId, handle))}
        onCancel={() => setAberto("nenhum")}
      />
    </aside>
  );
}
