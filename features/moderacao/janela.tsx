"use client";

import { useActionState, useEffect, useState } from "react";
import { Button, Chip, Input, Janela, TextField } from "@/design/components";
import { editarComunidadeDaTela, type EstadoDaEdicao } from "@/features/comunidades/actions";
import type { ReactNode } from "react";

type Secao = "denuncias" | "comunidade";

/**
 * A moderação como **janela** sobre a tela da comunidade (protótipo v6).
 *
 * Duas seções: Denúncias — o que já existia, com Membros e Moderadores
 * dentro — e Comunidade, que é nova e é o que faltava: até aqui o nome, a
 * descrição, o Sobre e as regras eram escritos uma vez na criação e nunca
 * mais.
 *
 * Abre em Denúncias quando há alguma pendente, e em Comunidade quando não
 * há: quem abre a moderação com a fila limpa veio mexer na comunidade.
 *
 * O conteúdo das denúncias vem pronto do servidor, por `children`: ele
 * depende de permissão, e permissão se confere lá.
 */
export function JanelaDeModeracao({
  aberta,
  onFechar,
  slug,
  communityId,
  nome,
  intro,
  about,
  regras,
  pendentes,
  denuncias,
}: {
  aberta: boolean;
  onFechar: () => void;
  slug: string;
  communityId: string;
  nome: string;
  intro: string;
  about: string;
  /** Uma por linha, como o campo guarda. */
  regras: string;
  pendentes: number;
  denuncias: ReactNode;
}) {
  const [secao, setSecao] = useState<Secao>(pendentes > 0 ? "denuncias" : "comunidade");

  return (
    <Janela titulo={`Moderar ${nome}`} aberta={aberta} onFechar={onFechar}>
      <div className="flex gap-1" role="group" aria-label="Seções da moderação">
        <Chip
          formato="pilula"
          label={pendentes > 0 ? `Denúncias (${pendentes})` : "Denúncias"}
          selected={secao === "denuncias"}
          onClick={() => setSecao("denuncias")}
        />
        <Chip
          formato="pilula"
          label="Comunidade"
          selected={secao === "comunidade"}
          onClick={() => setSecao("comunidade")}
        />
      </div>

      {secao === "denuncias" ? (
        denuncias
      ) : (
        <FormularioDaComunidade
          slug={slug}
          communityId={communityId}
          nome={nome}
          intro={intro}
          about={about}
          regras={regras}
        />
      )}
    </Janela>
  );
}

/**
 * Editar a comunidade.
 *
 * Os limites são os do banco — nome 60, intro 240 —, e não os do protótipo
 * (40 e 120): baixar o teto sobre comunidades já escritas recusaria salvar
 * o que está lá hoje.
 */
function FormularioDaComunidade({
  slug,
  communityId,
  nome,
  intro,
  about,
  regras,
}: {
  slug: string;
  communityId: string;
  nome: string;
  intro: string;
  about: string;
  regras: string;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDaEdicao, FormData>(
    editarComunidadeDaTela,
    {},
  );
  /*
   * A confirmação some sozinha: um "Salvo" permanente vira moldura, e na
   * próxima edição ninguém sabe se é desta vez ou da anterior.
   *
   * O que se guarda é **qual** estado já sumiu, e não um booleano ligado
   * no efeito: marcar o booleano na hora seria mudar estado durante a
   * sincronização, o que encadeia renderizações — e o lint reprova, com
   * razão. Aqui o `setState` só acontece dentro do relógio.
   */
  const [jaSumiu, setJaSumiu] = useState<EstadoDaEdicao | null>(null);

  useEffect(() => {
    if (!estado.salva || jaSumiu === estado) return;
    const relogio = setTimeout(() => setJaSumiu(estado), 4000);
    return () => clearTimeout(relogio);
  }, [estado, jaSumiu]);

  const salvo = Boolean(estado.salva) && jaSumiu !== estado;

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="comunidade" value={slug} />
      <input type="hidden" name="communityId" value={communityId} />

      <Input label="Nome" name="name" required maxLength={60} defaultValue={nome} />

      <TextField
        label="Descrição curta"
        name="intro"
        maxLength={240}
        defaultValue={intro}
        className="w-full"
      />

      <TextField
        label="Sobre"
        name="about"
        maxLength={500}
        tall
        defaultValue={about}
        className="w-full"
      />

      <TextField
        label="Regras (uma por linha, até 5)"
        name="rules"
        maxLength={400}
        tall
        defaultValue={regras}
        className="w-full"
      />

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      {salvo ? (
        <p role="status" className="text-caption text-success">
          Alterações salvas.
        </p>
      ) : null}

      <Button type="submit" disabled={pendente} disabledHint="Salvando as alterações">
        Salvar alterações
      </Button>
    </form>
  );
}
