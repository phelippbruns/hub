"use client";

import { useState, useTransition } from "react";
import { Button, RadioGroup, TextField } from "@/design/components";
import { bloquearPessoa, enviarDenuncia } from "./actions";

export type MotivoNaTela = { id: string; label: string };

/**
 * O formulário da tela 26.
 *
 * Denunciar e bloquear ficam **na mesma tela**: quem está denunciando
 * alguém quase sempre quer as duas coisas, e obrigar a procurar a segunda
 * em outro lugar é pedir que a pessoa desista no meio.
 *
 * As duas ações são independentes — bloquear não exige escolher motivo, e
 * denunciar não bloqueia ninguém sem a pessoa pedir.
 */
export function FormularioDeDenuncia({
  tipo,
  id,
  motivos,
  pessoa,
  voltar,
  focoNoBloqueio,
}: {
  tipo: string;
  id: string;
  motivos: MotivoNaTela[];
  pessoa: { id: string; nome: string } | null;
  voltar: string;
  focoNoBloqueio: boolean;
}) {
  const [motivo, setMotivo] = useState<string | null>(null);
  const [detalhes, setDetalhes] = useState("");
  const [pendente, iniciar] = useTransition();

  const denuncia = (
    <form action={(dados) => iniciar(() => enviarDenuncia(dados))} className="flex flex-col gap-2">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="voltar" value={voltar} />
      <input type="hidden" name="motivo" value={motivo ?? ""} />
      <input type="hidden" name="detalhes" value={detalhes} />

      <RadioGroup
        label="Motivo da denúncia"
        opcoes={motivos}
        valor={motivo}
        onEscolher={setMotivo}
      />

      {/* Só "outro motivo" abre o texto: nos outros o rótulo já é a
          categoria, e repetir convida ao desabafo que ninguém vai ler. */}
      {motivo === "outro" ? (
        <TextField
          label="O que aconteceu"
          maxLength={240}
          value={detalhes}
          onValueChange={setDetalhes}
        />
      ) : null}

      <Button
        type="submit"
        disabled={motivo === null || pendente}
        disabledHint={motivo === null ? "Escolha um motivo para enviar." : undefined}
      >
        Enviar denúncia
      </Button>
    </form>
  );

  const bloqueio = pessoa ? (
    <form action={(dados) => iniciar(() => bloquearPessoa(dados))} className="flex flex-col gap-1">
      <input type="hidden" name="pessoaId" value={pessoa.id} />
      <input type="hidden" name="voltar" value={voltar} />
      <Button type="submit" variant="secondary" disabled={pendente}>
        Bloquear {pessoa.nome}
      </Button>
      {/* RN26: a consequência vem escrita antes da decisão. */}
      <p className="text-caption text-inkMuted">
        Bloquear tira você das Cabines que tem com {pessoa.nome} e impede novos convites. A pessoa
        não é avisada.
      </p>
    </form>
  ) : null;

  // Quem chegou pelo botão Bloquear vê o bloqueio primeiro: foi o que pediu.
  return (
    <div className="flex flex-col gap-3">
      {focoNoBloqueio ? bloqueio : null}
      {denuncia}
      {focoNoBloqueio ? null : bloqueio}
    </div>
  );
}
