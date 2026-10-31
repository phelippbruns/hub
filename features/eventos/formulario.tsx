"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Chip, Input, Janela, TextField } from "@/design/components";
import { criarEventoDaComunidade, type EstadoDoEvento } from "./actions";

/** O dia de hoje em `AAAA-MM-DD`, para o campo não aceitar ontem. */
function hoje() {
  const agora = new Date();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");
  return `${agora.getFullYear()}-${mes}-${dia}`;
}

/**
 * Criar um encontro (RN38).
 *
 * O formato muda o formulário: presencial pede o local, online oferece o
 * link da sala com o aviso de que ele só chega a quem confirmar. Mostrar
 * os dois campos sempre faria parecer que o encontro precisa dos dois.
 */
export function FormularioDeEvento({
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
  const [estado, acao, pendente] = useActionState<EstadoDoEvento, FormData>(
    criarEventoDaComunidade,
    {},
  );
  const [formato, setFormato] = useState<"online" | "presencial">("online");

  useEffect(() => {
    if (estado.criado) aoFechar();
  }, [estado.criado, aoFechar]);

  return (
    <Janela titulo="Novo encontro" aberta={aberto} onFechar={aoFechar}>
      <form action={acao} className="flex flex-col gap-3">
        <input type="hidden" name="comunidade" value={slug} />
        <input type="hidden" name="communityId" value={communityId} />
        <input type="hidden" name="formato" value={formato} />

        <Input label="Nome do encontro" name="titulo" required maxLength={80} autoComplete="off" />

        <div className="flex gap-2">
          <Input label="Data" name="dia" type="date" required min={hoje()} className="flex-1" />
          <Input label="Hora" name="hora" type="time" required className="flex-1" />
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-label text-ink">Formato</span>
          <div className="flex gap-1" role="group" aria-label="Formato do encontro">
            <Chip
              formato="pilula"
              label="Online"
              selected={formato === "online"}
              onClick={() => setFormato("online")}
            />
            <Chip
              formato="pilula"
              label="Presencial"
              selected={formato === "presencial"}
              onClick={() => setFormato("presencial")}
            />
          </div>
        </div>

        {formato === "presencial" ? (
          <Input
            label="Local"
            name="local"
            required
            maxLength={80}
            autoComplete="off"
            hint="Bairro, cidade e estado"
          />
        ) : (
          <Input
            label="Link do encontro"
            name="linkDoEncontro"
            type="url"
            maxLength={300}
            autoComplete="off"
            hint="Só aparece para quem confirmar presença."
          />
        )}

        <TextField label="Descrição" name="descricao" maxLength={300} tall className="w-full" />

        <Input
          label="Vagas (opcional)"
          name="vagas"
          type="number"
          min={2}
          max={500}
          hint="Deixe vazio para não ter limite."
        />

        {estado.erro ? (
          <p role="alert" className="text-caption text-error">
            {estado.erro}
          </p>
        ) : null}

        <div className="flex flex-col gap-1">
          <Button variant="secondary" onClick={aoFechar}>
            Cancelar
          </Button>
          <Button type="submit" disabled={pendente} disabledHint="Criando o encontro">
            Criar encontro
          </Button>
        </div>
      </form>
    </Janela>
  );
}
