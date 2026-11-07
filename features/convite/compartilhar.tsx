"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Button, Chip, Input } from "@/design/components";
import {
  compartilhar,
  procurarSeguidoresParaCompartilhar,
  type EstadoDoCompartilhamento,
} from "./actions";

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
 * **Só aparece quem te segue** (decisão do PO, 5 de novembro). Antes era
 * a mesma lista do convite da Cabine, que junta membros de comunidade em
 * comum com quem se segue mutuamente — mandar um tópico virava uma lista
 * de gente que nunca demonstrou interesse em você.
 *
 * As regras do convite continuam valendo, porque compartilhar **abre uma
 * Cabine**: quem marcou "ninguém pode me convidar" fica de fora (RN23) e
 * o bloqueio vale nos dois sentidos (RN26). Quem filtra é o servidor,
 * em `meusSeguidoresParaCompartilhar`.
 */
export function Compartilhar({
  tipo,
  id,
  endereco,
  pessoas,
  aoFechar,
}: {
  tipo: "comunidade" | "topico";
  id: string;
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
        const achadas = await procurarSeguidoresParaCompartilhar(termo);
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
          se segue com você recebe na hora; quem não, recebe um convite e vê ao aceitar.
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
          {termo ? "Nenhuma pessoa com esse nome." : "Ninguém te segue ainda."}
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

      {/*
        **O botão só existe depois de escolher alguém** (pedido do PO, 7
        de novembro).
        
        Antes ele ficava à vista, desativado, escrito "Enviar para 0
        pessoas", com "Escolha quem vai receber" embaixo. Duas linhas
        para dizer que nada tinha sido feito ainda — e a folha já mostra
        isso: nenhum nome está marcado.

        A ação não some: ela aparece no instante em que passa a existir.
      */}
      {escolhidas.length > 0 ? (
        <Button type="submit" disabled={enviando}>
          {enviando
            ? "Enviando…"
            : `Enviar para ${escolhidas.length} ${escolhidas.length === 1 ? "pessoa" : "pessoas"}`}
        </Button>
      ) : null}

      <Button
        variant="secondary"
        onClick={() => {
          void navigator.clipboard?.writeText(linkAbsoluto()).then(() => setCopiado(true));
        }}
      >
        {copiado ? "Link copiado" : "Copiar link"}
      </Button>

      {/*
        Não há mais "Outros apps" (`navigator.share`), tirado a pedido do
        PO em 5 de novembro. Compartilhar no Hub é mandar para alguém do
        Hub; quem quiser levar para fora copia o link, que é o endereço
        canônico do tópico — o que abre a tela de convite para quem não
        tem conta.
      */}
    </form>
  );
}
