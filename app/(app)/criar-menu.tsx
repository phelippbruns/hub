"use client";

import { useState, useTransition } from "react";
import { Eixo, Janela, LoadingBlock, Rotulo, Skeleton } from "@/design/components";
import { CommunityHash, CreateIcon, TopicStar } from "@/design/icons";
import { FormularioNovoTopico } from "@/features/topicos/formulario-novo";
import { FormularioNovaComunidade } from "@/features/comunidades/formulario-nova";
import { comunidadesParaCriarTopico, type ComunidadeParaCriar } from "./criar-actions";

/**
 * O `+` da barra lateral, e a janela que ele abre.
 *
 * **Um item só, e uma janela sobre a página em que a pessoa está** — pedido
 * do PO em 12 de novembro de 2026. Eram dois links, "Criar tópico" e "Criar
 * comunidade", e os dois **levavam embora**:
 *
 * - `/criar-topico` com uma comunidade redirecionava para `/c/<slug>?novo=1`;
 * - com duas ou mais, abria o formulário sobre uma página quase vazia — e
 *   **fechar a janela jogava a pessoa em `/comunidades/minhas`**, uma
 *   terceira tela que ela não pediu;
 * - `/comunidades/nova` era uma página própria.
 *
 * **Mora em `app/(app)/` e não numa feature** porque compõe duas: o
 * formulário de tópico é de `features/topicos` e o de comunidade é de
 * `features/comunidades`, e uma feature não importa de outra. `app/` é a
 * camada que compõe.
 *
 * Os dois endereços antigos continuam existindo e redirecionam — endereço
 * que já foi compartilhado nunca vira 404.
 */

type Passo = "fechado" | "escolher" | "topico" | "comunidade";

export function MenuDeCriar({ gifLigado = false }: { gifLigado?: boolean }) {
  const [passo, setPasso] = useState<Passo>("fechado");
  const [comunidades, setComunidades] = useState<ComunidadeParaCriar[] | null>(null);
  const [carregando, carregar] = useTransition();

  function abrirTopico() {
    setPasso("topico");
    /*
     * A lista é buscada **agora**, e não no layout: a barra está em toda
     * tela autenticada, e pagar uma consulta por navegação para alimentar
     * uma janela que quase nunca abre seria caro em troca de nada.
     */
    if (comunidades === null) {
      carregar(async () => setComunidades(await comunidadesParaCriarTopico()));
    }
  }

  function fechar() {
    setPasso("fechado");
  }

  return (
    <>
      <button
        type="button"
        aria-label="Criar"
        aria-expanded={passo !== "fechado"}
        onClick={() => setPasso("escolher")}
        className="rounded-pill text-label h-navItem text-ink hover:bg-surfacePage flex cursor-pointer items-center gap-2 font-semibold"
      >
        <Eixo>
          <span className="bg-ink text-paper rounded-pill size-control grid place-items-center">
            <CreateIcon decorative className="size-iconNav" />
          </span>
        </Eixo>
        <Rotulo>Criar</Rotulo>
      </button>

      <Janela titulo={tituloDa(passo)} aberta={passo !== "fechado"} onFechar={fechar}>
        {passo === "escolher" ? (
          <div className="flex flex-col gap-2">
            <Opcao
              onClick={abrirTopico}
              icone={<TopicStar className="size-iconNav" />}
              fundo="bg-ink text-paper"
              titulo="Criar tópico"
              explicacao="Uma pergunta para uma comunidade de que você participa."
            />
            <Opcao
              onClick={() => setPasso("comunidade")}
              icone={<CommunityHash className="size-iconNav" />}
              fundo="bg-lavender text-ink"
              titulo="Criar comunidade"
              explicacao="Um interesse novo, com capa e descrição."
            />
          </div>
        ) : null}

        {passo === "topico" ? (
          carregando || comunidades === null ? (
            <LoadingBlock label="Carregando suas comunidades">
              <Skeleton className="h-navItem w-full" />
              <Skeleton className="h-navItem w-full" />
            </LoadingBlock>
          ) : comunidades.length === 0 ? (
            <p className="text-body text-ink">
              Você ainda não está em nenhuma comunidade. Entre numa para abrir um tópico.
            </p>
          ) : (
            <FormularioNovoTopico
              comunidadeSlug={comunidades[0]!.slug}
              nomeDaComunidade={comunidades[0]!.nome}
              jaUsouODia={comunidades[0]!.jaUsouODia}
              /*
                Com uma só, o formulário não desenha o campo de escolher —
                e a comunidade é essa. Com duas ou mais, o campo aparece.
              */
              escolherEntre={comunidades}
              gifLigado={gifLigado}
            />
          )
        ) : null}

        {passo === "comunidade" ? <FormularioNovaComunidade /> : null}
      </Janela>
    </>
  );
}

function tituloDa(passo: Passo): string {
  switch (passo) {
    case "topico":
      return "Novo tópico";
    case "comunidade":
      return "Nova comunidade";
    default:
      return "Criar";
  }
}

function Opcao({
  onClick,
  icone,
  fundo,
  titulo,
  explicacao,
}: {
  onClick: () => void;
  icone: React.ReactNode;
  fundo: string;
  titulo: string;
  explicacao: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="bg-surfacePage hover:ring-lavender flex cursor-pointer items-center gap-3 rounded-sm p-3 text-left hover:ring-2 hover:ring-inset"
    >
      <span className={`rounded-pill size-control grid shrink-0 place-items-center ${fundo}`}>
        {icone}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className="text-bodyStrong text-ink">{titulo}</span>
        <span className="text-caption text-inkMuted">{explicacao}</span>
      </span>
    </button>
  );
}
