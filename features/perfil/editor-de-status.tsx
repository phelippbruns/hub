"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Input, Janela } from "@/design/components";
import {
  TIPOS_DE_STATUS,
  limiteDoStatus,
  nomeDoStatus,
  prefixoDoStatus,
  type TipoDeStatus,
} from "@/lib/status";
import { IconeDoStatus, type StatusDaTela } from "./status";
import { limparMeuStatus, salvarMeuStatus, type EstadoDoStatus } from "./actions";

/**
 * RN40: escolher o tipo, escrever, salvar — ou limpar.
 *
 * Numa `Janela` e não numa folha: ela é o modal completo do Hub, com véu,
 * `Esc`, foco preso e foco devolvido a quem abriu. Um editor de uma frase
 * ainda assim é um diálogo, e quem chega por teclado precisa sair de onde
 * entrou.
 *
 * **O limite muda com o tipo, e o contador muda junto.** Trocar de
 * Personalizado para Ouvindo com 55 caracteres escritos não apaga o texto:
 * o contador fica vermelho e o servidor recusa. Apagar o que alguém
 * escreveu por causa de um clique num chip seria pior do que deixar
 * corrigir.
 */
export function EditorDeStatus({
  aberto,
  atual,
  onFechar,
}: {
  aberto: boolean;
  atual: StatusDaTela;
  onFechar: () => void;
}) {
  return (
    <Janela titulo="Seu status" aberta={aberto} onFechar={onFechar}>
      {/* Montado só quando abre: cada abertura começa do que está salvo, e
          não do que foi escrito e desistido na vez anterior. */}
      {aberto ? <Formulario atual={atual} onFechar={onFechar} /> : null}
    </Janela>
  );
}

function Formulario({ atual, onFechar }: { atual: StatusDaTela; onFechar: () => void }) {
  const [tipo, setTipo] = useState<TipoDeStatus>(atual?.tipo ?? "listening");
  const [texto, setTexto] = useState(atual?.texto ?? "");
  const [estado, salvar, salvando] = useActionState<EstadoDoStatus, FormData>(salvarMeuStatus, {});
  const [limpando, limparAction, limpandoAgora] = useActionState<EstadoDoStatus, FormData>(
    limparMeuStatus,
    {},
  );

  /*
   * Fechar quando o servidor aceitou, e não no clique: fechar antes da
   * resposta esconderia o erro de validação e deixaria a pessoa achando
   * que salvou.
   */
  useEffect(() => {
    if (estado.salvo || limpando.salvo) onFechar();
  }, [estado.salvo, limpando.salvo, onFechar]);

  const limite = limiteDoStatus(tipo);
  const prefixo = prefixoDoStatus(tipo);
  const vazio = texto.trim().length === 0;
  const passou = texto.length > limite;

  return (
    <div className="flex flex-col gap-3">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-caption text-ink mb-2 font-bold">Tipo</legend>
        <div className="flex flex-wrap gap-2">
          {TIPOS_DE_STATUS.map((opcao) => {
            const escolhido = opcao === tipo;
            return (
              <button
                key={opcao}
                type="button"
                aria-pressed={escolhido}
                onClick={() => setTipo(opcao)}
                className={`text-caption rounded-pill flex cursor-pointer items-center gap-1 px-3 py-2 font-semibold ${
                  escolhido ? "bg-ink text-paper" : "bg-surfacePage text-ink"
                }`}
              >
                <IconeDoStatus tipo={opcao} decorative className="size-iconSm" />
                {nomeDoStatus(opcao)}
              </button>
            );
          })}
        </div>
      </fieldset>

      <form action={salvar} className="flex flex-col gap-3">
        <input type="hidden" name="tipo" value={tipo} />

        <Input
          name="texto"
          label={prefixo ? `${prefixo}…` : "Escreva seu status"}
          value={texto}
          onChange={(evento) => setTexto(evento.target.value)}
          /*
            `maxLength` é o do maior tipo, não o do tipo escolhido: cortar o
            texto ao trocar de chip apagaria o que a pessoa escreveu. Quem
            avisa é o contador, e quem recusa é o servidor.
          */
          maxLength={60}
          contador
          hint={
            passou
              ? `Este tipo aceita ${limite} caracteres. Encurte ou escolha Personalizado.`
              : undefined
          }
          error={estado.erro}
          placeholder={prefixo ? "Uma coisa só" : "Ex.: De férias até segunda"}
          autoFocus
        />

        <div className="flex flex-wrap items-center justify-between gap-2">
          {atual ? (
            <Button
              variant="secondary"
              size="sm"
              type="submit"
              formAction={limparAction}
              disabled={limpandoAgora}
            >
              Limpar status
            </Button>
          ) : (
            <span />
          )}

          <div className="flex gap-2">
            <Button variant="secondary" type="button" onClick={onFechar}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={vazio || passou || salvando}
              disabledHint={
                vazio
                  ? "Escreva o status, ou use Limpar status"
                  : passou
                    ? "Encurte o status para salvar"
                    : undefined
              }
            >
              {salvando ? "Salvando…" : "Salvar"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
