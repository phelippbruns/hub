"use client";

import { useState, useTransition } from "react";
import { Button, EmptyState } from "@/design/components";
import { julgarDenuncia } from "./actions";

export type DenunciaNaTela = {
  id: string;
  motivo: string;
  detalhes: string | null;
  vezes: number;
  trecho: string | null;
  onde: string | null;
  autor: { nome: string; handle: string } | null;
  podeRemover: boolean;
};

/**
 * A aba Denúncias (tela 27).
 *
 * Cada linha traz **o que foi denunciado**, não só que alguém denunciou:
 * quem modera decide com o trecho na frente, sem precisar sair da tela e
 * procurar a resposta no tópico.
 */
export function FilaDeDenuncias({
  slug,
  communityId,
  denuncias,
}: {
  slug: string;
  communityId: string;
  denuncias: DenunciaNaTela[];
}) {
  const [pendente, iniciar] = useTransition();
  const [agindoEm, setAgindoEm] = useState<string | null>(null);

  if (denuncias.length === 0) {
    return (
      <EmptyState
        title="Nenhuma denúncia aberta"
        description="Quando alguém denunciar uma contribuição, um tópico ou uma pessoa daqui, ela aparece nesta fila."
      />
    );
  }

  function julgar(id: string, decisao: "remover" | "manter" | "banir") {
    setAgindoEm(id);
    iniciar(() => julgarDenuncia(slug, communityId, id, decisao));
  }

  return (
    <ul className="flex flex-col gap-2">
      {denuncias.map((denuncia) => (
        <li key={denuncia.id} className="bg-paper flex flex-col gap-1 rounded-sm p-3">
          <p className="text-caption text-inkMuted">
            {denuncia.autor ? `${denuncia.autor.nome} @${denuncia.autor.handle} · ` : ""}
            {denuncia.onde ? `em ${denuncia.onde} · ` : ""}
            {denuncia.vezes > 1
              ? `denunciada ${denuncia.vezes} vezes por ${denuncia.motivo.toLowerCase()}`
              : `denunciada por ${denuncia.motivo.toLowerCase()}`}
          </p>

          {denuncia.trecho ? <p className="text-body text-ink">{denuncia.trecho}</p> : null}

          {/* O texto livre fica aqui, e só aqui: ele não viaja no aviso de
              quem teve o conteúdo removido. */}
          {denuncia.detalhes ? (
            <p className="text-caption text-inkMuted">“{denuncia.detalhes}”</p>
          ) : null}

          <div className="flex gap-1">
            {denuncia.podeRemover ? (
              <Button
                size="sm"
                variant="danger"
                disabled={pendente && agindoEm === denuncia.id}
                onClick={() => julgar(denuncia.id, "remover")}
              >
                Remover
              </Button>
            ) : null}
            <Button
              size="sm"
              variant="secondary"
              disabled={pendente && agindoEm === denuncia.id}
              onClick={() => julgar(denuncia.id, "manter")}
            >
              Manter
            </Button>
            {denuncia.autor ? (
              <Button
                size="sm"
                variant="danger"
                disabled={pendente && agindoEm === denuncia.id}
                onClick={() => julgar(denuncia.id, "banir")}
              >
                Banir
              </Button>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
