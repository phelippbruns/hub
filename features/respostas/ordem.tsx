"use client";

import { useRouter } from "next/navigation";
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

  function ir(ordem: OrdemDasContribuicoes) {
    router.push(ordem === "estrelas" ? endereco : `${endereco}?ordem=${ordem}`);
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
