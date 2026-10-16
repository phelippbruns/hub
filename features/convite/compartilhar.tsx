"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button, Chip, Input } from "@/design/components";
import { procurarParaConvidar } from "@/features/cabines/actions";
import { compartilhar, type EstadoDoCompartilhamento } from "./actions";

export type PessoaParaCompartilhar = {
  id: string;
  nome: string;
  handle: string;
  emComum: string[];
};

type Pessoa = PessoaParaCompartilhar;

/**
 * O conteúdo da folha de compartilhar (F14), igual para comunidade e tópico.
 *
 * Uma só, e não uma por tela: as duas folhas faziam a mesma coisa e teriam
 * divergido na primeira mudança.
 *
 * Só aparece quem **pode** receber: a busca é a mesma da Cabine, que já
 * respeita a comunidade em comum (RN21), a escolha de quem aceita convite
 * (RN23) e o bloqueio nos dois sentidos (RN26).
 */
/** O compartilhamento do sistema, com cópia do link como saída. */
async function compartilharFora(titulo: string, url: string) {
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title: titulo, url });
      return;
    } catch {
      // Fechar a folha do sistema não é erro, e não vale cair na cópia.
      return;
    }
  }

  await navigator.clipboard?.writeText(url);
}

export function Compartilhar({
  tipo,
  id,
  nome,
  endereco,
  pessoas,
  aoFechar,
}: {
  tipo: "comunidade" | "topico";
  id: string;
  nome: string;
  /** Caminho da página, para montar o link absoluto no navegador. */
  endereco: string;
  pessoas: Pessoa[];
  aoFechar: () => void;
}) {
  const [estado, acao, enviando] = useActionState<EstadoDoCompartilhamento, FormData>(
    compartilhar,
    {},
  );
  const [escolhidas, setEscolhidas] = useState<string[]>([]);
  const [procurado, setProcurado] = useState("");
  const [resultado, setResultado] = useState<{ termo: string; pessoas: Pessoa[] } | null>(null);
  const [, iniciarBusca] = useTransition();
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    const termo = procurado.trim();
    if (!termo) return;

    let valeu = true;
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

  function linkAbsoluto() {
    return `${window.location.origin}${endereco}`;
  }

  if (estado.enviadoPara) {
    return (
      <div className="flex flex-col gap-2">
        <p role="status" className="text-body text-ink">
          Enviado para {estado.enviadoPara} {estado.enviadoPara === 1 ? "pessoa" : "pessoas"}. Quem
          ainda não tem Cabine com você recebe um convite, e vê o que você mandou ao aceitar.
        </p>
        <Button variant="secondary" onClick={aoFechar}>
          Fechar
        </Button>
      </div>
    );
  }

  return (
    <form action={acao} className="flex flex-col gap-2">
      <input type="hidden" name="tipo" value={tipo} />
      <input type="hidden" name="id" value={id} />
      {escolhidas.map((pessoaId) => (
        <input key={pessoaId} type="hidden" name="pessoas" value={pessoaId} />
      ))}

      <Input
        label="Buscar pessoas"
        name="busca"
        type="search"
        autoComplete="off"
        value={procurado}
        onChange={(evento) => setProcurado(evento.target.value)}
      />

      {visiveis.length === 0 ? (
        <p className="text-caption text-inkMuted">
          {termo ? "Nenhuma pessoa com esse nome." : "Ninguém das suas comunidades por aqui."}
        </p>
      ) : (
        <div role="group" aria-label="Pessoas" className="flex flex-wrap gap-2">
          {visiveis.map((pessoa) => (
            <Chip
              key={pessoa.id}
              label={pessoa.nome}
              selected={escolhidas.includes(pessoa.id)}
              onClick={() =>
                setEscolhidas((atual) =>
                  atual.includes(pessoa.id)
                    ? atual.filter((x) => x !== pessoa.id)
                    : [...atual, pessoa.id],
                )
              }
            />
          ))}
        </div>
      )}

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={enviando || escolhidas.length === 0}
        disabledHint={escolhidas.length === 0 ? "Escolha quem vai receber." : undefined}
      >
        {enviando
          ? "Enviando…"
          : `Enviar para ${escolhidas.length} ${escolhidas.length === 1 ? "pessoa" : "pessoas"}`}
      </Button>

      <Button
        variant="secondary"
        onClick={() => {
          void navigator.clipboard?.writeText(linkAbsoluto()).then(() => setCopiado(true));
        }}
      >
        {copiado ? "Link copiado" : "Copiar link"}
      </Button>

      {/*
        `navigator.share` não existe em todo navegador, e só funciona em
        HTTPS. Em vez de esconder o botão quando falta — o que exigiria
        decidir isso depois da montagem, e piscaria —, ele **sempre faz
        alguma coisa**: sem o compartilhamento do sistema, copia o link.
      */}
      <Button variant="secondary" onClick={() => void compartilharFora(nome, linkAbsoluto())}>
        Outros apps
      </Button>
    </form>
  );
}
