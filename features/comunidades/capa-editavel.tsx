"use client";

import { useEffect, useRef, useState } from "react";
import { AjusteDeImagem, Button, CommunityCover } from "@/design/components";
import { TAMANHO_MAXIMO_EM_MB, problemaNaImagem } from "@/lib/midia/limites";
import {
  ANCORA_PADRAO,
  ENQUADRAMENTO_PADRAO,
  QUADRO_DA_CAPA,
  ancoraDoEnquadramento,
  enquadramentoDaAncora,
  type Ancora,
  type Enquadramento,
  type Medidas,
} from "@/lib/midia/enquadramento";

/**
 * A capa da comunidade, trocada e ajustada **no próprio lugar dela**.
 *
 * Antes havia uma tela só para isso, em `/c/<slug>/capa`: você saía da
 * comunidade, escolhia um arquivo, via uma prévia sem poder mexer, salvava
 * e voltava. Agora clicar na capa já abre o seletor do computador, a prévia
 * aparece onde a capa vai ficar, e o ajuste acontece ali mesmo — pedido do
 * PO, e o mesmo padrão da foto de perfil.
 *
 * **O OK não envia nada.** Ele encerra o ajuste; a imagem e os três números
 * sobem no envio do formulário que cerca este componente. É o que permite
 * um componente só nas duas telas: na de criar comunidade ainda não existe
 * comunidade, então não haveria onde guardar — e subir a imagem antes de o
 * nome ser validado desperdiçaria arquivo a cada nome repetido. Quem está
 * na comunidade não percebe a diferença, porque lá o OK dispara o envio.
 *
 * Este componente **não desenha formulário**: ele é usado dentro de um, e
 * `<form>` dentro de `<form>` é HTML inválido.
 */
export function CapaEditavel({
  nome,
  capaAtual,
  medidasAtuais = null,
  zoomAtual = 1,
  ancoraAtual = ANCORA_PADRAO,
  podeEditar = true,
  rotulo = "Trocar a capa",
  aoConfirmar,
  esquerda,
  direita,
  children,
}: {
  nome: string;
  capaAtual: string | null;
  medidasAtuais?: Medidas | null;
  zoomAtual?: number;
  ancoraAtual?: Ancora;
  /** Quem não modera vê a capa, e só. */
  podeEditar?: boolean;
  rotulo?: string;
  /** O que o OK faz além de fechar o ajuste. Na comunidade, envia. */
  aoConfirmar?: () => void;
  /** Canto de cima à esquerda da capa: normalmente o voltar. */
  esquerda?: React.ReactNode;
  /** Canto de cima à direita: compartilhar e o menu de três pontos. */
  direita?: React.ReactNode;
  /** O que aparece sobre a capa quando não se está ajustando. */
  children?: React.ReactNode;
}) {
  const arquivo = useRef<HTMLInputElement>(null);
  const [nova, setNova] = useState<{ url: string; medidas: Medidas } | null>(null);
  const [ajustando, setAjustando] = useState(false);
  const [enquadramento, setEnquadramento] = useState<Enquadramento>(ENQUADRAMENTO_PADRAO);
  const [problema, setProblema] = useState<string | null>(null);

  // O endereço temporário da prévia é do navegador, e precisa ser devolvido.
  useEffect(() => {
    const url = nova?.url;
    return () => {
      if (url) URL.revokeObjectURL(url);
    };
  }, [nova?.url]);

  function escolher(escolhido: File | undefined) {
    if (!escolhido) return;

    const recusa = problemaNaImagem(escolhido);
    setProblema(recusa);
    if (recusa) return;

    const url = URL.createObjectURL(escolhido);
    const imagem = new Image();
    imagem.onload = () => {
      setNova({ url, medidas: { largura: imagem.naturalWidth, altura: imagem.naturalHeight } });
      setEnquadramento(ENQUADRAMENTO_PADRAO);
      setAjustando(true);
    };
    imagem.src = url;
  }

  /*
   * Reabrir o ajuste da capa que já está lá: a âncora guardada volta a ser
   * deslocamento. Sem esta volta, clicar em "Ajustar" faria a imagem pular
   * para o centro, e o único jeito de recuperar o enquadramento seria
   * acertá-lo de novo no olho.
   */
  function reabrir() {
    if (!medidasAtuais) return;
    setEnquadramento(enquadramentoDaAncora(medidasAtuais, zoomAtual, ancoraAtual, QUADRO_DA_CAPA));
    setAjustando(true);
  }

  const emAjuste =
    nova ?? (medidasAtuais && capaAtual ? { url: capaAtual, medidas: medidasAtuais } : null);

  /*
   * O campo de arquivo fica **fora dos dois caminhos de desenho**, e só
   * existe para quem pode trocar a capa.
   *
   * Fora e **sempre na mesma posição da árvore**. É ele que carrega os
   * bytes no envio do formulário, e um campo de arquivo que o React
   * desmonta perde o arquivo escolhido. Quando ele morava dentro de cada
   * caminho de desenho, escolher uma imagem abria o ajuste, o React via
   * outra árvore e recriava o campo vazio: a comunidade nascia sem capa,
   * sem erro nenhum na tela.
   *
   * Só para quem pode, porque um campo de envio de arquivo na árvore de
   * quem está apenas lendo a comunidade é uma porta que não leva a lugar
   * nenhum — e aparecia para o leitor de tela.
   */
  const campoDeArquivo = podeEditar ? (
    <input
      ref={arquivo}
      type="file"
      name="imagem"
      accept="image/jpeg,image/png,image/webp"
      aria-label={rotulo}
      className="sr-only"
      onChange={(evento) => escolher(evento.target.files?.[0])}
    />
  ) : null;

  const ajuste = (
    <div className="flex flex-col gap-1">
      <AjusteDeImagem
        // Trocar de imagem recomeça o ajuste: o enquadramento anterior foi
        // escolhido para outra foto.
        key={emAjuste?.url}
        url={emAjuste?.url ?? ""}
        medidas={emAjuste?.medidas ?? { largura: 1, altura: 1 }}
        inicial={enquadramento}
        onMudar={setEnquadramento}
        quadro={QUADRO_DA_CAPA}
        forma="retangulo"
        prefixo="capa"
        controles="dentro"
        camposEscondidos={false}
        className="min-h-cover w-full"
      >
        <Button
          size="sm"
          className="self-start"
          onClick={() => {
            setAjustando(false);
            aoConfirmar?.();
          }}
        >
          OK
        </Button>
      </AjusteDeImagem>
      <p className="text-caption text-inkMuted">
        Arraste para posicionar e use o controle para aproximar. O OK aplica.
      </p>
    </div>
  );

  const parada = (
    <div className="flex flex-col gap-1">
      <div className="relative">
        <CommunityCover
          name={nome}
          coverUrl={nova?.url ?? capaAtual}
          medidas={nova?.medidas ?? medidasAtuais}
          zoom={nova ? enquadramento.zoom : zoomAtual}
          ancora={
            nova ? ancoraDoEnquadramento(nova.medidas, enquadramento, QUADRO_DA_CAPA) : ancoraAtual
          }
          esquerda={esquerda}
          direita={direita}
        >
          {children}
        </CommunityCover>

        {podeEditar ? (
          /*
            Um botão de verdade, e não um `onClick` na capa: quem navega por
            teclado precisa alcançar isto com Tab. Ele fica no canto de
            baixo, longe de voltar, compartilhar e o menu, que moram em cima.
          */
          <div className="absolute right-3 bottom-3 flex gap-1">
            {medidasAtuais || nova ? (
              <Button variant="secondary" size="sm" onClick={reabrir}>
                Ajustar
              </Button>
            ) : null}
            <Button variant="secondary" size="sm" onClick={() => arquivo.current?.click()}>
              {rotulo}
            </Button>
          </div>
        ) : null}
      </div>

      {/*
        A linha dos formatos só aparece para quem pode trocar a capa. Ela
        estava sempre visível, e quem só estava lendo a comunidade via uma
        instrução de envio de arquivo logo abaixo do título.
      */}
      {problema ? (
        <p role="alert" className="text-caption text-error">
          {problema}
        </p>
      ) : podeEditar ? (
        <p className="text-caption text-inkMuted">
          JPEG, PNG ou WebP, até {TAMANHO_MAXIMO_EM_MB} MB. A localização que a foto carrega é
          removida antes de guardar.
        </p>
      ) : null}
    </div>
  );

  return (
    <>
      {campoDeArquivo}

      {/*
        Os três números moram aqui, e não dentro do ajuste, pelo mesmo
        motivo do campo de arquivo: o ajuste **fecha** ao confirmar, e o que
        sai da árvore não é enviado. Enquanto eles viveram lá dentro, o OK
        mandava a imagem sem o enquadramento e a capa voltava para o centro
        — sem erro nenhum na tela.
      */}
      {emAjuste ? (
        <>
          <input type="hidden" name="capaZoom" value={enquadramento.zoom} />
          <input type="hidden" name="capaOx" value={enquadramento.ox} />
          <input type="hidden" name="capaOy" value={enquadramento.oy} />
        </>
      ) : null}

      {ajustando && emAjuste ? ajuste : parada}
    </>
  );
}
