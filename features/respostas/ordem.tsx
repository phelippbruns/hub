"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ChronologicalIcon, StarIcon } from "@/design/icons";
import type { OrdemDasContribuicoes } from "./shared";

/**
 * A ordem das contribuições (tela 15, protótipo v6).
 *
 * Pílula com dois botões: estrela e relógio. **O relógio alterna** a cada
 * clique entre mais novas e mais antigas — são dois destinos num controle
 * só porque "por data" é uma escolha, e "para que lado" é o ajuste dela.
 *
 * O rótulo acessível **diz a ordem atual**, não só o que o clique faz:
 * quem não vê qual dos dois está aceso precisa dessa frase para saber em
 * que ordem está lendo.
 *
 * A escolha vai na URL, como as abas da comunidade: o endereço fica
 * compartilhável e o botão voltar funciona. O valor padrão (`estrelas`)
 * é omitido, para o endereço limpo ser o endereço normal.
 */
export function OrdemDasRespostas({
  endereco,
  atual,
}: {
  endereco: string;
  atual: OrdemDasContribuicoes;
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  /*
   * **Preserva o que já está na URL**, e isso não é detalhe.
   *
   * O tópico vive em `/c/<comunidade>?t=<topico>` desde que a tela cheia
   * saiu. Montar o endereço do zero — `${endereco}?ordem=...` — apagava o
   * `?t=` junto: clicar no relógio **fechava o tópico** e devolvia a
   * lista da comunidade. O padrão certo é o de
   * `features/comunidades/controles-de-topicos.tsx`: copiar os
   * parâmetros, mexer só no seu, e apagá-lo no valor padrão para o
   * endereço limpo ser o endereço normal.
   */
  function ir(ordem: OrdemDasContribuicoes) {
    const novos = new URLSearchParams(parametros.toString());
    if (ordem === "estrelas") novos.delete("ordem");
    else novos.set("ordem", ordem);

    const busca = novos.toString();
    router.push(busca ? `${endereco}?${busca}` : endereco, { scroll: false });
  }

  const porData = atual !== "estrelas";

  const rotuloDoRelogio = !porData
    ? "Ordenar por data, mais novas primeiro"
    : atual === "novas"
      ? "Mais novas primeiro. Toque para ver as mais antigas."
      : "Mais antigas primeiro. Toque para ver as mais novas.";

  return (
    <div
      role="group"
      aria-label="Ordem das contribuições"
      className="bg-surfacePage rounded-pill inline-flex items-center gap-1 p-1"
    >
      <Opcao ativo={!porData} rotulo="Ordenar por mais estrelas" onClick={() => ir("estrelas")}>
        <StarIcon decorative className="size-iconTool" />
      </Opcao>

      <Opcao
        ativo={porData}
        rotulo={rotuloDoRelogio}
        // Primeiro clique: mais novas. Depois, alterna.
        onClick={() => ir(atual === "novas" ? "antigas" : "novas")}
      >
        <ChronologicalIcon decorative className="size-iconTool" />
      </Opcao>
    </div>
  );
}

function Opcao({
  ativo,
  rotulo,
  onClick,
  children,
}: {
  ativo: boolean;
  rotulo: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      aria-label={rotulo}
      title={rotulo}
      onClick={onClick}
      /* 36 px, o mesmo da caixa de contribuição: o PO pediu o par. */
      className={`size-controlSm rounded-pill grid cursor-pointer place-items-center ${
        ativo ? "bg-ink text-paper" : "text-inkMuted hover:bg-lavenderSoft"
      }`}
    >
      {children}
    </button>
  );
}
