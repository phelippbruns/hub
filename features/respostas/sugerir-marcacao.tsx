"use client";

import { useEffect, useState, useTransition } from "react";
import { Chip } from "@/design/components";
import { arrobaSobOCursor } from "@/lib/texto/mencoes";
import { sugerirParaMarcar, type PessoaSugerida } from "./actions";

/**
 * Sugere quem marcar enquanto a pessoa digita o @ (F15).
 *
 * Sem isto, marcar exige **decorar o @ exato** de quem se quer chamar — e
 * errar uma letra não dá erro nenhum: o texto fica lá, parecendo uma
 * marcação, sem avisar ninguém.
 *
 * Aparece só quando o cursor está dentro de um @ sendo escrito. Uma lista
 * permanente roubaria espaço do campo de resposta e sugeriria marcar como
 * se fosse o normal.
 */
export function SugerirMarcacao({
  topicId,
  texto,
  posicaoDoCursor,
  aoEscolher,
}: {
  topicId: string;
  texto: string;
  posicaoDoCursor: number;
  /** Devolve o @ escolhido, para o campo substituir o que estava escrito. */
  aoEscolher: (handle: string, inicio: number, fim: number) => void;
}) {
  const emEdicao = arrobaSobOCursor(texto, posicaoDoCursor);
  const termo = emEdicao?.termo ?? null;

  const [resultado, setResultado] = useState<{ termo: string; pessoas: PessoaSugerida[] } | null>(
    null,
  );
  const [, buscar] = useTransition();

  useEffect(() => {
    if (termo === null) return;

    let valeu = true;
    const relogio = setTimeout(() => {
      buscar(async () => {
        const achadas = await sugerirParaMarcar(topicId, termo);
        if (valeu) setResultado({ termo, pessoas: achadas });
      });
    }, 200);

    return () => {
      valeu = false;
      clearTimeout(relogio);
    };
  }, [termo, topicId]);

  if (termo === null || !emEdicao) return null;
  if (resultado?.termo !== termo || resultado.pessoas.length === 0) return null;

  return (
    <div role="group" aria-label="Marcar alguém" className="flex flex-wrap gap-1">
      {resultado.pessoas.map((pessoa) => (
        <Chip
          key={pessoa.handle}
          label={`@${pessoa.handle}`}
          onClick={() => aoEscolher(pessoa.handle, emEdicao.inicio, emEdicao.fim)}
        />
      ))}
    </div>
  );
}
