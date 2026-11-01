"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Janela } from "@/design/components";
import { alternarMembro } from "./actions";

/** O que a janela precisa saber da comunidade. */
export type ParaEntrar = {
  id: string;
  slug: string;
  name: string;
  intro: string;
  regras: string[];
};

/**
 * A janela de entrar na comunidade, aberta de qualquer lugar.
 *
 * **Era só do cabeçalho**, e as outras telas resolviam a falta de
 * participação desabilitando o botão. O protótipo v6 faz o contrário: quem
 * não participa e clica em votar, confirmar presença ou seguir **recebe
 * esta janela**. O clique vira convite, não recusa.
 *
 * A diferença não é de gentileza, é de função: botão desabilitado não diz o
 * que fazer para habilitá-lo, e a dica que o `Button` imprime aparece
 * **abaixo de cada botão** — numa enquete de quatro opções, "Entre na
 * comunidade para votar" aparecia quatro vezes.
 *
 * Com regras escritas, elas aparecem antes, e o botão diz "Li e quero
 * entrar": concordar com uma regra que ninguém mostrou não é concordar com
 * nada, e é a moderação dessa comunidade que vai cobrar depois. Sem regras,
 * a janela é a intro e o convite.
 */
export function JanelaDeEntrada({
  comunidade,
  aberta,
  onFechar,
}: {
  comunidade: ParaEntrar;
  aberta: boolean;
  onFechar: () => void;
}) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();

  function entrar() {
    iniciar(async () => {
      try {
        await alternarMembro(comunidade.id, comunidade.slug, false);
        onFechar();
        /*
         * `refresh()` e não estado local: entrar muda a tela inteira — o
         * botão de criar aparece, as opções da enquete passam a aceitar
         * clique, a marca # vira "Participando". Espelhar isso no cliente
         * seria manter duas verdades.
         */
        router.refresh();
      } catch {
        onFechar();
      }
    });
  }

  const temRegras = comunidade.regras.length > 0;

  return (
    <Janela titulo={`Entrar em ${comunidade.name}`} aberta={aberta} onFechar={onFechar}>
      <p className="text-body text-inkMuted">{comunidade.intro}</p>

      {temRegras ? (
        <div className="bg-surfacePage rounded-sm px-3 py-2">
          <p className="text-label text-ink">
            {comunidade.regras.length === 1
              ? "Ao entrar, você concorda com a regra:"
              : "Ao entrar, você concorda com as regras:"}
          </p>
          <ol className="text-body text-ink mt-1 flex list-decimal flex-col gap-1 pl-4 wrap-anywhere">
            {comunidade.regras.map((regra) => (
              <li key={regra}>{regra}</li>
            ))}
          </ol>
        </div>
      ) : null}

      <div className="flex flex-col gap-1">
        <Button variant="secondary" onClick={onFechar}>
          Agora não
        </Button>
        <Button onClick={entrar} disabled={pendente} disabledHint="Aguarde um instante">
          {temRegras ? "Li e quero entrar" : "Entrar na comunidade"}
        </Button>
      </div>
    </Janela>
  );
}
