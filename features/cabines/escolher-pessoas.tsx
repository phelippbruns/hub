"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button, Chip, Input, TextField } from "@/design/components";
import { acharLink } from "@/lib/texto/links";
import { convidarParaCabine, procurarParaConvidar, type EstadoDoConvite } from "./actions";
import { LIMITE_DA_MENSAGEM, MAXIMO_DE_CONVIDADOS } from "./shared";

export type PessoaSugerida = {
  id: string;
  nome: string;
  handle: string;
  emComum: string[];
};

/**
 * Tela 18: escolher quem convidar.
 *
 * A lista é só de gente que **pode** ser convidada: quem divide comunidade
 * (RN21), não bloqueou e aceita convites (RN23). Mostrar alguém que o
 * servidor vai recusar seria oferecer o que não dá para cumprir.
 *
 * As comunidades em comum aparecem debaixo de cada nome porque são a razão
 * pela qual aquela pessoa está na lista.
 */
export function EscolherPessoas({
  pessoas,
  preSelecionada,
  cabine,
}: {
  pessoas: PessoaSugerida[];
  /** Vindo do botão Cabine de um perfil: a pessoa já chega marcada. */
  preSelecionada?: string;
  /** Vindo do menu de uma Cabine: o convite é para ela, não para uma nova. */
  cabine?: string;
}) {
  const [estado, acao, enviando] = useActionState<EstadoDoConvite, FormData>(
    convidarParaCabine,
    {},
  );
  const [escolhidas, setEscolhidas] = useState<string[]>(preSelecionada ? [preSelecionada] : []);
  const [mensagem, setMensagem] = useState("");
  const [procurado, setProcurado] = useState("");

  const link = mensagem.trim() ? acharLink(mensagem) : null;
  const cheia = escolhidas.length >= MAXIMO_DE_CONVIDADOS;

  /*
   * A busca vai ao **servidor**.
   *
   * Filtrar no navegador a lista que já veio parecia suficiente, e só
   * funciona enquanto cabe tudo na primeira página: quem não estivesse
   * entre os primeiros nomes nunca era encontrado, e o campo de busca
   * existia sem buscar.
   */
  /*
   * O resultado guarda **o termo junto**.
   *
   * Sem isso, apagar a busca ou digitar mais uma letra mostraria por um
   * instante a lista da busca anterior — e, pior, exigiria limpar o estado
   * dentro do efeito, que é o que provoca renderização em cascata.
   */
  const [resultado, setResultado] = useState<{ termo: string; pessoas: PessoaSugerida[] } | null>(
    null,
  );
  const [procurando, iniciarBusca] = useTransition();

  useEffect(() => {
    const termo = procurado.trim();
    if (!termo) return;

    let valeu = true;

    // Espera a pessoa parar de digitar: uma ida ao servidor por tecla seria
    // uma consulta por letra.
    const relogio = setTimeout(() => {
      iniciarBusca(async () => {
        const achadas = await procurarParaConvidar(termo);
        if (valeu) setResultado({ termo, pessoas: achadas });
      });
    }, 250);

    return () => {
      valeu = false;
      clearTimeout(relogio);
    };
  }, [procurado]);

  const termo = procurado.trim();
  const visiveis = termo ? (resultado?.termo === termo ? resultado.pessoas : []) : pessoas;
  const esperando = termo !== "" && resultado?.termo !== termo;

  function alternar(id: string) {
    setEscolhidas((atual) => (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]));
  }

  return (
    <form action={acao} className="flex flex-col gap-3">
      {escolhidas.map((id) => (
        <input key={id} type="hidden" name="pessoas" value={id} />
      ))}
      {cabine ? <input type="hidden" name="cabine" value={cabine} /> : null}

      <Input
        label="Buscar pessoas"
        name="busca"
        type="search"
        autoComplete="off"
        value={procurado}
        onChange={(evento) => setProcurado(evento.target.value)}
      />

      <TextField
        label="Mensagem do convite"
        name="mensagem"
        maxLength={LIMITE_DA_MENSAGEM}
        tall
        value={mensagem}
        onValueChange={setMensagem}
        className="w-full"
        error={link ? `Tire o endereço: "${link.trecho}"` : undefined}
      />

      <h2 className="text-caption text-inkMuted font-bold">
        Sugestões com base nas suas comunidades
      </h2>

      {procurando || esperando ? (
        <p className="text-caption text-inkMuted" aria-live="polite">
          Procurando…
        </p>
      ) : visiveis.length === 0 ? (
        <p className="text-caption text-inkMuted">
          {pessoas.length === 0
            ? "Ninguém das suas comunidades está disponível para convite agora."
            : "Nenhuma pessoa com esse nome."}
        </p>
      ) : (
        <div role="group" aria-label="Pessoas" className="flex flex-col gap-1">
          {visiveis.map((pessoa) => {
            const escolhida = escolhidas.includes(pessoa.id);
            return (
              <span key={pessoa.id} className="flex items-center gap-2">
                <Chip
                  label={pessoa.nome}
                  selected={escolhida}
                  // Cheia, só dá para tirar — não para pôr mais.
                  onClick={cheia && !escolhida ? undefined : () => alternar(pessoa.id)}
                />
                {pessoa.emComum.length > 0 ? (
                  <span className="text-caption text-inkMuted min-w-0 truncate">
                    {pessoa.emComum.join(", ")}
                  </span>
                ) : null}
              </span>
            );
          })}
        </div>
      )}

      <p aria-live="polite" className="text-caption text-inkMuted">
        {escolhidas.length === 0
          ? "Nenhuma pessoa escolhida."
          : `${escolhidas.length} ${escolhidas.length === 1 ? "pessoa" : "pessoas"}. Cada uma recebe um convite e entra se aceitar.`}
      </p>

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
          {estado.trechoProibido ? ` Tire o endereço: "${estado.trechoProibido}"` : ""}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={enviando || escolhidas.length === 0 || link !== null}
        disabledHint={
          escolhidas.length === 0
            ? "Escolha ao menos uma pessoa."
            : link
              ? "Tire o endereço da mensagem."
              : undefined
        }
      >
        {enviando ? "Enviando…" : "Enviar convites"}
      </Button>
    </form>
  );
}
