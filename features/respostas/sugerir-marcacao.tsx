"use client";

import { useEffect, useState, useTransition } from "react";
import { Chip } from "@/design/components";
import { marcacaoSobOCursor, type TipoDeMarcacao } from "@/lib/texto/marcacoes";
import { sugerirParaMarcar, type Sugestao } from "./actions";

/** O sinal de cada tipo, para montar o chip e o que entra no campo. */
function sinalDe(tipo: TipoDeMarcacao): string {
  switch (tipo) {
    case "comunidade":
      return "#";
    case "topico":
      return "*";
    default:
      return "@";
  }
}

function rotuloDoGrupo(tipo: TipoDeMarcacao): string {
  switch (tipo) {
    case "comunidade":
      return "Marcar uma comunidade";
    case "topico":
      return "Marcar um tópico";
    default:
      return "Marcar alguém";
  }
}

/**
 * Sugere o que marcar enquanto a pessoa digita `@`, `#` ou `*`.
 *
 * Sem isto, marcar exige **decorar o endereço exato** — e errar uma letra
 * não dá erro nenhum: o texto fica lá, parecendo uma marcação, sem virar
 * link e sem avisar ninguém.
 *
 * Aparece só quando o cursor está dentro de uma marcação sendo escrita. Uma
 * lista permanente roubaria espaço do campo de resposta e sugeriria marcar
 * como se fosse o normal.
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
  /** Devolve o que foi escolhido, para o campo substituir o que estava lá. */
  aoEscolher: (trecho: string, inicio: number, fim: number) => void;
}) {
  const emEdicao = marcacaoSobOCursor(texto, posicaoDoCursor);
  const termo = emEdicao?.termo ?? null;
  const tipo = emEdicao?.tipo ?? null;

  const [resultado, setResultado] = useState<{
    chave: string;
    achados: Sugestao[];
  } | null>(null);
  const [, buscar] = useTransition();

  useEffect(() => {
    if (termo === null || tipo === null) return;

    const chave = `${tipo}:${termo}`;
    let valeu = true;
    const relogio = setTimeout(() => {
      buscar(async () => {
        const achados = await sugerirParaMarcar(topicId, tipo, termo);
        if (valeu) setResultado({ chave, achados });
      });
    }, 200);

    return () => {
      valeu = false;
      clearTimeout(relogio);
    };
  }, [termo, tipo, topicId]);

  if (termo === null || tipo === null || !emEdicao) return null;
  if (resultado?.chave !== `${tipo}:${termo}` || resultado.achados.length === 0) return null;

  const sinal = sinalDe(tipo);

  return (
    <div role="group" aria-label={rotuloDoGrupo(tipo)} className="flex flex-wrap gap-1">
      {resultado.achados.map((achado) => (
        <Chip
          key={achado.valor}
          label={`${sinal}${achado.valor}`}
          onClick={() => aoEscolher(`${sinal}${achado.valor}`, emEdicao.inicio, emEdicao.fim)}
        />
      ))}
    </div>
  );
}
