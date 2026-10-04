"use client";

import { useActionState, useState } from "react";
import { Button, Chip, Steps } from "@/design/components";
import { TopicStarInline } from "@/design/icons";
import { escolherComunidades } from "./actions";
import { MINIMO_DE_COMUNIDADES, type EstadoDoOnboarding } from "./shared";

type Comunidade = { id: string; name: string };
type Universo = { id: string; name: string; communities: Comunidade[] };

/**
 * Tela 5, segundo e terceiro estados: "Do que você gosta?".
 *
 * Os chips de Universo (amarelos) filtram; os de comunidade (lavanda)
 * escolhem. Sem nenhum Universo marcado, tudo aparece — é melhor mostrar
 * opções do que uma tela vazia esperando um primeiro clique.
 */
export function EscolherComunidades({
  universos,
  convite,
}: {
  universos: Universo[];
  /** RN31: a comunidade do link vem marcada e conta como uma das 3. */
  convite: { topicName: string; community: { id: string; name: string } } | null;
}) {
  const [estado, action, enviando] = useActionState<EstadoDoOnboarding, FormData>(
    escolherComunidades,
    {},
  );

  const [universosAbertos, setUniversosAbertos] = useState<string[]>([]);
  const [escolhidas, setEscolhidas] = useState<string[]>(convite ? [convite.community.id] : []);

  const faltam = MINIMO_DE_COMUNIDADES - escolhidas.length;
  const podeContinuar = faltam <= 0;

  const visiveis =
    universosAbertos.length === 0
      ? universos
      : universos.filter((u) => universosAbertos.includes(u.id));

  function alternar(lista: string[], id: string) {
    return lista.includes(id) ? lista.filter((x) => x !== id) : [...lista, id];
  }

  return (
    <form action={action} className="flex flex-col gap-3">
      <Steps total={3} current={3} />

      {convite ? (
        <p className="text-body text-inkMuted">
          Escolha ao menos {MINIMO_DE_COMUNIDADES} comunidades. Depois, você volta para{" "}
          <span className="text-ink font-semibold">
            <TopicStarInline className="mr-1" />
            {convite.topicName}
          </span>
          .
        </p>
      ) : null}

      {/* As escolhas vão como campos escondidos: o formulário funciona do
          mesmo jeito, e a action recebe uma lista. */}
      {escolhidas.map((id) => (
        <input key={id} type="hidden" name="comunidades" value={id} />
      ))}

      {convite ? (
        <section className="flex flex-col gap-1">
          <h2 className="text-caption text-inkMuted font-bold">Do seu convite</h2>
          <div role="group" aria-label="Do seu convite" className="flex flex-wrap gap-2">
            <Chip
              label={convite.community.name}
              selected={escolhidas.includes(convite.community.id)}
              onClick={() => setEscolhidas((atual) => alternar(atual, convite.community.id))}
            />
          </div>
        </section>
      ) : null}

      <section className="flex flex-col gap-1">
        <h2 className="text-caption text-inkMuted font-bold">Universos</h2>
        <div role="group" aria-label="Universos" className="flex flex-wrap gap-2">
          {universos.map((universo) => (
            <Chip
              key={universo.id}
              label={universo.name}
              tone="sun"
              selected={universosAbertos.includes(universo.id)}
              onClick={() => setUniversosAbertos((atual) => alternar(atual, universo.id))}
            />
          ))}
        </div>
      </section>

      {visiveis.map((universo) => (
        <section key={universo.id} className="flex flex-col gap-1">
          <h2 className="text-caption text-inkMuted font-bold">{universo.name}</h2>
          <div
            role="group"
            aria-label={`Comunidades de ${universo.name}`}
            className="flex flex-wrap gap-2"
          >
            {universo.communities
              .filter((c) => c.id !== convite?.community.id)
              .map((comunidade) => (
                <Chip
                  key={comunidade.id}
                  label={comunidade.name}
                  selected={escolhidas.includes(comunidade.id)}
                  onClick={() => setEscolhidas((atual) => alternar(atual, comunidade.id))}
                />
              ))}
          </div>
        </section>
      ))}

      <p aria-live="polite" className="text-caption text-inkMuted">
        {escolhidas.length} de {MINIMO_DE_COMUNIDADES} escolhidas
      </p>

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={!podeContinuar || enviando}
        // O design system pede que botão desativado sempre diga o que falta.
        // Concorda com o número: "Falta 1 comunidade", "Faltam 2 comunidades".
        disabledHint={
          podeContinuar
            ? undefined
            : faltam === 1
              ? "Falta 1 comunidade."
              : `Faltam ${faltam} comunidades.`
        }
        className="w-full"
      >
        {enviando ? "Salvando…" : "Continuar"}
      </Button>
    </form>
  );
}
