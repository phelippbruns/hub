"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { Button, Chip, Input, Janela, TextField } from "@/design/components";
import { criarEventoDaComunidade, type EstadoDoEvento } from "./actions";

/** O dia de hoje em `AAAA-MM-DD`, para o campo não aceitar ontem. */
function hoje() {
  return emCampos(new Date()).dia;
}

/**
 * A próxima hora redonda, que é o que os campos de data e hora já vêm
 * preenchidos: quem marca evento marca na hora cheia, e dois campos vazios
 * fazem a pessoa digitar o óbvio.
 */
function proximaHoraRedonda() {
  const quando = new Date();
  quando.setMinutes(0, 0, 0);
  quando.setHours(quando.getHours() + 1);
  return emCampos(quando);
}

function emCampos(quando: Date) {
  const dois = (valor: number) => String(valor).padStart(2, "0");
  return {
    dia: `${quando.getFullYear()}-${dois(quando.getMonth() + 1)}-${dois(quando.getDate())}`,
    hora: `${dois(quando.getHours())}:${dois(quando.getMinutes())}`,
  };
}

/**
 * Criar um evento (RN38).
 *
 * O formato muda o formulário: presencial pede o local, online oferece o
 * link da sala com o aviso de que ele só chega a quem confirmar. Mostrar
 * os dois campos sempre faria parecer que o evento precisa dos dois.
 *
 * **O link continua sendo um campo**, embora o protótipo não o tenha: lá
 * ele é inventado (`hub.app/e/<slug>`), e o Hub não hospeda chamada. Sem o
 * campo a RN38 perderia a razão de existir — não haveria link para
 * esconder de quem não confirmou presença.
 *
 * Um botão só, à direita, e nada de "Cancelar" empilhado: o X fecha a
 * janela. Print do PO de 31 de outubro.
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
  return (
    <Janela titulo="Novo evento" aberta={aberto} onFechar={aoFechar}>
      {/*
        Os campos só são montados quando a janela abre, e isso não é
        economia: é o que permite calcular a sugestão de data e hora **na
        montagem**, com `useState`, em vez de dentro de um efeito.
        Calculada uma vez no cabeçalho — que fica montado a sessão inteira —
        a sugestão de hora envelheceria; num efeito, o lint recusa, e com
        razão.
      */}
      {aberto ? <Campos slug={slug} communityId={communityId} aoFechar={aoFechar} /> : null}
    </Janela>
  );
}

function Campos({
  slug,
  communityId,
  aoFechar,
}: {
  slug: string;
  communityId: string;
  aoFechar: () => void;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDoEvento, FormData>(
    criarEventoDaComunidade,
    {},
  );
  const [formato, setFormato] = useState<"online" | "presencial">("online");

  /*
   * A sugestão de data e hora é `defaultValue`, não valor controlado: o
   * campo continua sendo do navegador, e quem escreve continua dono dele.
   *
   * Controlado, uma jornada quebrava — a que escreve no campo **por fora,
   * pelo DOM**, para provar que o servidor recusa data no passado, e não só
   * o `min` do navegador. O React acompanha o valor de cada campo e
   * descarta um `input` cujo valor ele já registrou, então a escrita por
   * fora virava silêncio.
   *
   * Calculada na montagem, e isto só monta quando a janela abre: a hora
   * nunca é a de quando a página carregou.
   */
  const sugestao = useMemo(() => proximaHoraRedonda(), []);

  useEffect(() => {
    if (estado.criado) aoFechar();
  }, [estado.criado, aoFechar]);

  return (
    <form action={acao} className="flex flex-col gap-3">
      <input type="hidden" name="comunidade" value={slug} />
      <input type="hidden" name="communityId" value={communityId} />
      <input type="hidden" name="formato" value={formato} />

      <Input
        label="Nome do evento"
        name="titulo"
        required
        contador
        maxLength={80}
        autoComplete="off"
        placeholder="Ex.: Encontro online de dezembro"
      />

      <div className="flex gap-2">
        <Input
          label="Data"
          name="dia"
          type="date"
          required
          min={hoje()}
          defaultValue={sugestao.dia}
          className="flex-1"
        />
        <Input
          label="Hora"
          name="hora"
          type="time"
          required
          defaultValue={sugestao.hora}
          className="flex-1"
        />
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-label text-ink">Formato</span>
        <div className="flex gap-1" role="group" aria-label="Formato do evento">
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
        {/* A promessa da RN38 fica logo abaixo da escolha que a cria, e
              não presa ao campo do link: é a escolha de "Online" que a
              torna verdadeira. */}
        {formato === "online" ? (
          <p className="text-caption text-inkMuted">
            O link do evento só aparece para quem confirmar presença.
          </p>
        ) : null}
      </div>

      {formato === "presencial" ? (
        <Input
          label="Local"
          name="local"
          required
          maxLength={80}
          autoComplete="off"
          placeholder="Bairro, cidade e estado"
        />
      ) : (
        <Input
          label="Link do evento"
          name="linkDoEncontro"
          type="url"
          maxLength={300}
          autoComplete="off"
          placeholder="https://"
        />
      )}

      <TextField
        label="Descrição"
        name="descricao"
        maxLength={300}
        tall
        placeholder="O que vai acontecer e o que levar."
        className="w-full"
      />

      <Input
        label="Vagas (opcional)"
        name="vagas"
        type="number"
        min={2}
        max={500}
        placeholder="Sem limite"
      />

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pendente} disabledHint="Criando o evento">
          Criar evento
        </Button>
      </div>
    </form>
  );
}
