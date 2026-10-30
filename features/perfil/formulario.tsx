"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import {
  AjusteDeImagem,
  Avatar,
  Button,
  Input,
  SectionTitle,
  Switch,
  TextField,
} from "@/design/components";
import { acharLink } from "@/lib/texto/links";
import { TAMANHO_MAXIMO_EM_MB, problemaNaImagem } from "@/lib/midia/limites";
import { ENQUADRAMENTO_PADRAO, type Enquadramento } from "@/lib/midia/enquadramento";
import { MAXIMO_DE_LINKS } from "@/lib/data/validation";
import { FUNDOS_DO_PERFIL, fundoDaPagina } from "./fundos";
import { salvarPerfil, type EstadoDoPerfil } from "./actions";

export type LinkEditavel = { title: string; url: string };

/**
 * Editar o perfil (tela 22).
 *
 * Tudo numa tela: foto e enquadramento, nome, @, descrição, links, cor de
 * fundo e privacidade. **A cor escolhida já pinta esta tela**, como prévia —
 * escolher no escuro e descobrir o resultado depois de salvar faria a
 * pessoa salvar várias vezes só para ver.
 */
export function FormularioDePerfil({
  nome,
  handle,
  bio,
  avatarUrl,
  medidasDaFoto,
  enquadramentoInicial,
  linksIniciais,
  fundoInicial,
  escondeSeguidoresInicial,
}: {
  nome: string;
  handle: string;
  bio: string | null;
  avatarUrl: string | null;
  medidasDaFoto: { largura: number; altura: number } | null;
  enquadramentoInicial: Enquadramento;
  linksIniciais: LinkEditavel[];
  fundoInicial: string;
  escondeSeguidoresInicial: boolean;
}) {
  const [estado, acao, pendente] = useActionState<EstadoDoPerfil, FormData>(salvarPerfil, {});
  const [descricao, setDescricao] = useState(bio ?? "");
  const [fundo, setFundo] = useState(fundoDaPagina(fundoInicial).chave);
  const [esconde, setEsconde] = useState(escondeSeguidoresInicial);
  const [problemaDaFoto, setProblemaDaFoto] = useState<string | null>(null);
  const [enquadramento, setEnquadramento] = useState(enquadramentoInicial);
  const arquivoRef = useRef<HTMLInputElement>(null);

  /** A foto nova escolhida agora, com as medidas lidas no navegador. */
  const [nova, setNova] = useState<{
    url: string;
    medidas: { largura: number; altura: number };
  } | null>(null);

  // O endereço temporário da prévia some junto com a tela.
  useEffect(() => () => void (nova && URL.revokeObjectURL(nova.url)), [nova]);

  const [links, setLinks] = useState<LinkEditavel[]>(() =>
    Array.from(
      { length: MAXIMO_DE_LINKS },
      (_, i) => linksIniciais.at(i) ?? { title: "", url: "" },
    ),
  );

  // RN16: o aviso cita o trecho, como no campo de resposta.
  const link = descricao.trim() ? acharLink(descricao) : null;

  const fotoAtual = nova?.url ?? avatarUrl;
  const medidasAtuais = nova?.medidas ?? medidasDaFoto;
  const cores = fundoDaPagina(fundo);

  return (
    <form action={acao} className={`${cores.pagina} flex flex-col gap-3 rounded-md p-3`}>
      <section className={`${cores.cartao} flex flex-col gap-2 rounded-sm p-3`}>
        <SectionTitle>Foto de perfil</SectionTitle>

        {fotoAtual && medidasAtuais ? (
          <AjusteDeImagem
            forma="hexagono"
            className="size-fotoAjuste"
            // Trocar a foto recomeça o ajuste do zero, em vez de herdar o
            // enquadramento da anterior, que foi feito para outra imagem.
            key={fotoAtual}
            url={fotoAtual}
            medidas={medidasAtuais}
            inicial={nova ? ENQUADRAMENTO_PADRAO : enquadramento}
            onMudar={setEnquadramento}
          />
        ) : (
          <div className="flex items-center gap-3">
            <Avatar nome={nome} url={fotoAtual} tamanho="perfil" />
            <p className="text-caption text-inkMuted">
              Sem foto, o Hub mostra as suas iniciais.
              {fotoAtual && !medidasAtuais
                ? " Esta imagem não pôde ser medida, então fica centralizada."
                : ""}
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => arquivoRef.current?.click()}>
            {fotoAtual ? "Trocar foto" : "Enviar foto"}
          </Button>
        </div>

        <p
          className={problemaDaFoto ? "text-caption text-error" : "text-caption text-inkMuted"}
          role={problemaDaFoto ? "alert" : undefined}
        >
          {problemaDaFoto ?? `JPEG, PNG ou WebP, até ${TAMANHO_MAXIMO_EM_MB} MB.`}
        </p>

        <input
          ref={arquivoRef}
          type="file"
          name="foto"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          aria-label="Escolher foto do perfil"
          onChange={(evento) => {
            const escolhido = evento.target.files?.[0] ?? null;
            // O servidor confere de novo; isto evita um envio cortado no
            // caminho, que chegaria como erro sem explicação.
            const problema = escolhido ? problemaNaImagem(escolhido) : null;
            setProblemaDaFoto(problema);

            if (nova) URL.revokeObjectURL(nova.url);
            if (!escolhido || problema) {
              setNova(null);
              return;
            }

            /*
             * As medidas são lidas aqui só para o ajuste funcionar na hora.
             * **O servidor lê as dele dos bytes** e refaz a conta: estas
             * nunca saem do navegador.
             */
            const url = URL.createObjectURL(escolhido);
            const imagem = new Image();
            imagem.onload = () => {
              setNova({
                url,
                medidas: { largura: imagem.naturalWidth, altura: imagem.naturalHeight },
              });
              setEnquadramento(ENQUADRAMENTO_PADRAO);
            };
            imagem.src = url;
          }}
        />
      </section>

      <section className={`${cores.cartao} flex flex-col gap-2 rounded-sm p-3`}>
        <Input
          label="Nome"
          name="name"
          defaultValue={nome}
          required
          maxLength={80}
          error={estado.erros?.name}
        />

        <Input
          label="@"
          name="handle"
          defaultValue={handle}
          required
          maxLength={20}
          autoCapitalize="none"
          spellCheck={false}
          hint="Único no Hub."
          error={estado.erros?.handle}
        />

        <TextField
          label="Sobre mim"
          name="bio"
          maxLength={120}
          tall
          value={descricao}
          onValueChange={setDescricao}
          className="w-full"
          error={link ? `Tire o endereço: "${link.trecho}"` : estado.erros?.bio}
        />
      </section>

      <section className={`${cores.cartao} flex flex-col gap-2 rounded-sm p-3`}>
        <SectionTitle>Links</SectionTitle>
        <p className="text-caption text-inkMuted">
          Até {MAXIMO_DE_LINKS}. Título de até 12 caracteres. É o único lugar do Hub que aceita
          link.
        </p>

        {links.map((item, i) => (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,2fr)] gap-2">
            <Input
              label={`Título do link ${i + 1}`}
              rotuloOculto
              name={`linkTitulo${i}`}
              value={item.title}
              maxLength={12}
              placeholder="Título"
              onChange={(evento) =>
                setLinks((atual) =>
                  atual.map((l, j) => (i === j ? { ...l, title: evento.target.value } : l)),
                )
              }
            />
            <Input
              label={`Endereço do link ${i + 1}`}
              rotuloOculto
              name={`linkEndereco${i}`}
              value={item.url}
              maxLength={300}
              inputMode="url"
              autoCapitalize="none"
              spellCheck={false}
              placeholder="exemplo.com"
              onChange={(evento) =>
                setLinks((atual) =>
                  atual.map((l, j) => (i === j ? { ...l, url: evento.target.value } : l)),
                )
              }
            />
          </div>
        ))}

        {estado.erros?.links ? (
          <p role="alert" className="text-caption text-error">
            {estado.erros.links}
          </p>
        ) : null}
      </section>

      <section className={`${cores.cartao} flex flex-col gap-2 rounded-sm p-3`}>
        <SectionTitle>Cor de fundo</SectionTitle>
        <input type="hidden" name="fundo" value={fundo} />

        <div role="radiogroup" aria-label="Cor de fundo do perfil" className="flex flex-wrap gap-3">
          {FUNDOS_DO_PERFIL.map((opcao) => (
            <button
              key={opcao.chave}
              type="button"
              role="radio"
              aria-checked={fundo === opcao.chave}
              onClick={() => setFundo(opcao.chave)}
              className="flex cursor-pointer flex-col items-center gap-1"
            >
              {/*
                O ✓ é o segundo sinal, como manda o design system: as oito
                cores são claras e parecidas, e a escolha não pode depender
                de distinguir dois tons de quase branco.
              */}
              <span
                aria-hidden="true"
                className={`${opcao.pagina} size-navItem rounded-pill text-ink grid place-items-center font-extrabold ${
                  fundo === opcao.chave ? "border-ink border-2" : "border-inkMuted border"
                }`}
              >
                {fundo === opcao.chave ? "✓" : null}
              </span>
              <span className="text-caption text-inkMuted">{opcao.nome}</span>
            </button>
          ))}
        </div>
      </section>

      <section className={`${cores.cartao} flex flex-col gap-2 rounded-sm p-3`}>
        <SectionTitle>Privacidade</SectionTitle>
        <input type="hidden" name="esconderSeguidores" value={esconde ? "sim" : "nao"} />

        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-col">
            <span className="text-bodyStrong text-ink">Ocultar seguidores e seguindo</span>
            <span className="text-caption text-inkMuted">
              As outras pessoas deixam de ver os dois números. Você continua vendo.
            </span>
          </div>
          <Switch
            checked={esconde}
            onToggle={() => setEsconde((v) => !v)}
            label="Ocultar seguidores e seguindo"
          />
        </div>
      </section>

      {estado.erro ? (
        <p role="alert" className="text-caption text-error">
          {estado.erro}
        </p>
      ) : null}

      <Button
        type="submit"
        disabled={pendente || link !== null || problemaDaFoto !== null}
        disabledHint={problemaDaFoto ?? (link ? "Tire o endereço do Sobre mim." : undefined)}
      >
        {pendente ? "Salvando…" : "Salvar"}
      </Button>
    </form>
  );
}
