"use client";

import { useActionState, useRef, useState } from "react";
import { Button, CommunityCover } from "@/design/components";
import { TAMANHO_MAXIMO_EM_MB, problemaNaImagem } from "@/lib/midia/limites";
import { trocarCapaDaComunidade, type EstadoDaCapa } from "./actions";

/**
 * Trocar a capa da comunidade.
 *
 * Mostra a capa de hoje e a prévia da nova antes de enviar: trocar a cara da
 * comunidade inteira sem ver o resultado antes é o tipo de coisa de que
 * alguém se arrepende.
 */
export function FormularioDeCapa({
  comunidadeSlug,
  nome,
  capaAtual,
}: {
  comunidadeSlug: string;
  nome: string;
  capaAtual: string | null;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDaCapa, FormData>(
    trocarCapaDaComunidade,
    {},
  );
  const [previa, setPrevia] = useState<string | null>(null);
  const [nomeDoArquivo, setNomeDoArquivo] = useState<string | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const arquivoRef = useRef<HTMLInputElement>(null);

  function escolher(arquivo: File | null) {
    if (previa) URL.revokeObjectURL(previa);
    setPrevia(arquivo ? URL.createObjectURL(arquivo) : null);
  }

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="comunidade" value={comunidadeSlug} />

      <CommunityCover name={nome} coverUrl={previa ?? capaAtual} />

      {/*
        O controle de arquivo do navegador vem em inglês — "Choose File / No
        file chosen" — e não há como traduzi-lo. Então ele fica escondido do
        olho (mas não do leitor de tela nem do teclado) e quem aparece é um
        botão nosso, em português.
      */}
      <input
        ref={arquivoRef}
        type="file"
        name="imagem"
        accept="image/jpeg,image/png,image/webp"
        required
        className="sr-only"
        aria-label="Escolher nova capa"
        onChange={(evento) => {
          const escolhido = evento.target.files?.[0] ?? null;
          // Conferir antes de enviar: o servidor confere de novo, mas um
          // arquivo grande demais seria cortado no caminho, sem explicação.
          setProblema(escolhido ? problemaNaImagem(escolhido) : null);
          setNomeDoArquivo(escolhido?.name ?? null);
          escolher(escolhido);
        }}
      />

      <div className="flex items-center gap-2">
        <Button variant="secondary" size="sm" onClick={() => arquivoRef.current?.click()}>
          Escolher imagem
        </Button>
        <span className="text-caption text-inkMuted min-w-0 flex-1 truncate">
          {nomeDoArquivo ?? "Nenhuma imagem escolhida"}
        </span>
      </div>

      <p className="text-caption text-inkMuted">
        JPEG, PNG ou WebP, até {TAMANHO_MAXIMO_EM_MB} MB. A localização que a foto carrega é
        removida antes de guardar.
      </p>

      {problema ? (
        <p role="alert" className="text-caption text-error">
          {problema}
        </p>
      ) : null}

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      {estado.trocada ? (
        <p role="status" className="text-caption text-success">
          Capa trocada.
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pendente || previa === null || problema !== null}
        disabledHint={problema ?? (previa === null ? "Escolha uma imagem." : undefined)}
      >
        {pendente ? "Enviando…" : "Trocar capa"}
      </Button>
    </form>
  );
}
