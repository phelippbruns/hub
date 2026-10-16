"use client";

import { useState, useTransition } from "react";
import { BottomSheet, Button, Input } from "@/design/components";
import { tirarMembro } from "./actions";

export type MembroNaTela = {
  id: string;
  nome: string;
  handle: string;
  moderador: boolean;
  criador: boolean;
  denuncias: number;
};

/**
 * A aba Membros (tela 27).
 *
 * A confirmação de remover oferece **banir ali mesmo**, com a diferença
 * escrita: "sai e pode entrar de novo" contra "não entra mais". É a decisão
 * que a moderação mais erra quando as duas moram em telas diferentes.
 */
export function MembrosDaComunidade({
  slug,
  communityId,
  nomeDaComunidade,
  membros,
  busca,
}: {
  slug: string;
  communityId: string;
  nomeDaComunidade: string;
  membros: MembroNaTela[];
  busca: string;
}) {
  const [pendente, iniciar] = useTransition();
  const [alvo, setAlvo] = useState<MembroNaTela | null>(null);

  // Fechar a folha faz parte da ação: sem isto ela fica aberta sobre a lista
  // já atualizada, e parece que o clique não funcionou.
  function tirar(banir: boolean) {
    if (!alvo) return;
    const pessoa = alvo;
    iniciar(async () => {
      await tirarMembro(slug, communityId, pessoa.id, banir);
      setAlvo(null);
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <form method="get" className="flex items-end gap-1">
        <input type="hidden" name="aba" value="membros" />
        <Input label="Buscar membros" name="busca" defaultValue={busca} className="flex-1" />
        <Button type="submit" variant="secondary">
          Buscar
        </Button>
      </form>

      <ul className="flex flex-col gap-1">
        {membros.map((membro) => (
          <li key={membro.id} className="bg-paper flex items-center gap-2 rounded-sm p-2">
            <span className="min-w-0 flex-1">
              <span className="text-bodyStrong text-ink block">{membro.nome}</span>
              <span className="text-caption text-inkMuted block">
                @{membro.handle}
                {membro.criador
                  ? ", criadora"
                  : membro.moderador
                    ? ", modera"
                    : membro.denuncias > 0
                      ? `, ${membro.denuncias} denúncia${membro.denuncias > 1 ? "s" : ""}`
                      : ", membro"}
              </span>
            </span>

            {/* Quem criou não aparece com botão: a regra existe no servidor,
                e um botão que sempre falha só gasta a paciência de quem clica. */}
            {membro.criador ? null : (
              <Button size="sm" variant="secondary" onClick={() => setAlvo(membro)}>
                Remover
              </Button>
            )}
          </li>
        ))}
      </ul>

      <BottomSheet title={`Remover ${alvo?.nome} da comunidade?`} open={alvo !== null}>
        <p className="text-body text-inkMuted">
          {alvo?.nome.split(" ")[0]} sai de {nomeDaComunidade} e pode entrar de novo. Para impedir a
          volta, use Banir.
        </p>
        <div className="flex flex-col gap-1">
          <Button variant="danger" disabled={pendente} onClick={() => tirar(false)}>
            Remover
          </Button>
          <Button variant="danger" disabled={pendente} onClick={() => tirar(true)}>
            Banir da comunidade
          </Button>
          <Button variant="secondary" onClick={() => setAlvo(null)}>
            Cancelar
          </Button>
        </div>
      </BottomSheet>
    </div>
  );
}
