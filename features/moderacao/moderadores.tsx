"use client";

import { useState, useTransition } from "react";
import { BottomSheet, Button, ConfirmSheet, Input } from "@/design/components";
import { convidarParaModerar, procurarMembros, tirarDaModeracao } from "./actions";

export type ModeradorNaTela = { id: string; nome: string; handle: string; criador: boolean };
type Achado = { id: string; nome: string; handle: string; moderador: boolean };

/**
 * A aba Moderadores (tela 27).
 *
 * Adicionar manda **convite**, não cargo: ninguém vira responsável por uma
 * comunidade sem ter dito que sim. Quem criou não aparece com botão de
 * remover — a RN06 liga a moderação a ela, e tirá-la deixaria a comunidade
 * sem dono.
 */
export function Moderadores({
  slug,
  communityId,
  eu,
  moderadores,
}: {
  slug: string;
  communityId: string;
  eu: string;
  moderadores: ModeradorNaTela[];
}) {
  const [pendente, iniciar] = useTransition();
  const [aberto, setAberto] = useState<"nenhum" | "adicionar" | "remover">("nenhum");
  const [paraRemover, setParaRemover] = useState<ModeradorNaTela | null>(null);
  const [termo, setTermo] = useState("");
  const [achados, setAchados] = useState<Achado[]>([]);
  const [convidada, setConvidada] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {moderadores.map((pessoa) => (
          <li key={pessoa.id} className="bg-paper flex items-center gap-2 rounded-sm p-2">
            <span className="min-w-0 flex-1">
              <span className="text-bodyStrong text-ink block">
                {pessoa.id === eu ? "Você" : pessoa.nome}
              </span>
              <span className="text-caption text-inkMuted block">
                @{pessoa.handle}
                {pessoa.criador ? ", criadora" : ""}
              </span>
            </span>
            {pessoa.criador || pessoa.id === eu ? null : (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  setParaRemover(pessoa);
                  setAberto("remover");
                }}
              >
                Remover
              </Button>
            )}
          </li>
        ))}
      </ul>

      <Button variant="secondary" onClick={() => setAberto("adicionar")}>
        Adicionar moderador
      </Button>

      <BottomSheet title="Adicionar moderador" open={aberto === "adicionar"}>
        <Input
          label="Buscar entre os membros"
          value={termo}
          onChange={(evento) => {
            const valor = evento.target.value;
            setTermo(valor);
            setConvidada(null);
            if (valor.trim().length < 2) {
              setAchados([]);
              return;
            }
            iniciar(async () => setAchados(await procurarMembros(communityId, valor)));
          }}
        />

        {achados
          .filter((pessoa) => !pessoa.moderador)
          .map((pessoa) => (
            <div key={pessoa.id} className="flex items-center gap-2">
              <span className="min-w-0 flex-1">
                <span className="text-bodyStrong text-ink block">{pessoa.nome}</span>
                <span className="text-caption text-inkMuted block">@{pessoa.handle}</span>
              </span>
              <Button
                size="sm"
                disabled={pendente}
                onClick={() =>
                  iniciar(async () => {
                    await convidarParaModerar(slug, communityId, pessoa.id);
                    // Só depois de o convite existir: anunciar antes faria a
                    // tela dizer "enviado" de um envio que falhou.
                    setConvidada(pessoa.nome);
                    setAchados([]);
                  })
                }
              >
                Enviar convite
              </Button>
            </div>
          ))}

        {convidada ? (
          <p className="text-caption text-inkMuted">
            {convidada} recebe um convite e vira moderadora ao aceitar.
          </p>
        ) : (
          <p className="text-caption text-inkMuted">
            Quem você escolher recebe um convite e só vira moderador ao aceitar.
          </p>
        )}

        <Button variant="secondary" onClick={() => setAberto("nenhum")}>
          Fechar
        </Button>
      </BottomSheet>

      <ConfirmSheet
        open={aberto === "remover" && paraRemover !== null}
        titulo={`Remover ${paraRemover?.nome} da moderação?`}
        descricao={`${paraRemover?.nome.split(" ")[0]} continua membro, mas perde as ferramentas de moderação, e é avisado.`}
        confirmar="Remover da moderação"
        pendente={pendente}
        onConfirm={() => {
          if (!paraRemover) return;
          const pessoa = paraRemover;
          iniciar(async () => {
            await tirarDaModeracao(slug, communityId, pessoa.id);
            setAberto("nenhum");
          });
        }}
        onCancel={() => setAberto("nenhum")}
      />
    </div>
  );
}
