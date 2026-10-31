"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Chip, Input, Janela } from "@/design/components";
import { criarEnqueteDaComunidade, type EstadoDaEnquete } from "./actions";
import { DURACOES_EM_DIAS } from "./shared";

/**
 * Criar uma enquete (RN37).
 *
 * Começa com duas caixas, que é o mínimo, e abre mais até quatro — o teto
 * é a chave primária no banco. Mostrar as quatro de saída faria a enquete
 * parecer exigir quatro opções.
 */
export function FormularioDeEnquete({
  slug,
  communityId,
  aberto,
  aoFechar,
}: {
  slug: string;
  communityId: string;
  aberto: boolean;
  aoFechar: () => void;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDaEnquete, FormData>(
    criarEnqueteDaComunidade,
    {},
  );
  const [quantas, setQuantas] = useState(2);
  const [dias, setDias] = useState<number>(3);

  // Criada, a folha fecha sozinha: deixá-la aberta sobre a lista já
  // atualizada faz parecer que o envio não funcionou.
  useEffect(() => {
    if (estado.criada) aoFechar();
  }, [estado.criada, aoFechar]);

  return (
    <Janela titulo="Nova enquete" aberta={aberto} onFechar={aoFechar}>
      <form action={acao} className="flex flex-col gap-3">
        <input type="hidden" name="comunidade" value={slug} />
        <input type="hidden" name="communityId" value={communityId} />
        <input type="hidden" name="dias" value={dias} />

        <Input
          label="Pergunta"
          name="pergunta"
          required
          maxLength={120}
          autoComplete="off"
          hint="O que a comunidade deve decidir?"
        />

        <div className="flex flex-col gap-1">
          <span className="text-label text-ink">Opções (de 2 a 4)</span>
          {Array.from({ length: quantas }, (_, i) => (
            <Input
              key={i}
              label={`Opção ${i + 1}`}
              rotuloOculto
              name="opcao"
              maxLength={40}
              autoComplete="off"
              required={i < 2}
            />
          ))}
          {quantas < 4 ? (
            <Button variant="secondary" size="sm" onClick={() => setQuantas(quantas + 1)}>
              Adicionar opção
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-label text-ink">Duração</span>
          <div className="flex gap-1" role="group" aria-label="Duração da enquete">
            {DURACOES_EM_DIAS.map((valor) => (
              <Chip
                key={valor}
                formato="pilula"
                label={valor === 1 ? "1 dia" : `${valor} dias`}
                selected={dias === valor}
                onClick={() => setDias(valor)}
              />
            ))}
          </div>
        </div>

        {estado.erro ? (
          <p role="alert" className="text-caption text-error">
            {estado.erro}
          </p>
        ) : null}

        <div className="flex flex-col gap-1">
          <Button variant="secondary" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente} disabledHint="Publicando a enquete">
            Publicar enquete
          </Button>
        </div>
      </form>
    </Janela>
  );
}
