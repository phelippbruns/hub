"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button, Janela } from "@/design/components";
import { TopicStar } from "@/design/icons/marks";
import { FormularioNovoTopico } from "./formulario-novo";

/**
 * Criar tópico: o botão e a janela que ele abre.
 *
 * **Era uma página**, `/c/<comunidade>/novo`, e no PR 6 eu escrevi que
 * continuaria sendo. O PO corrigiu em 31 de outubro com o print do
 * protótipo: a janela fica sobre a comunidade, que continua atrás. Faz
 * sentido — quem cria tópico está lendo a lista, e sair da lista para
 * voltar a ela é uma ida e volta que ninguém pediu.
 *
 * O botão e a janela moram no **mesmo componente** porque o estado de
 * aberto é um só. Separados, abrir precisaria de contexto ou de uma volta
 * ao servidor a cada clique.
 *
 * O endereço `/novo` continua existindo e redireciona para cá com
 * `?novo=1`: o atalho da barra lateral, os links de Primeiros passos e a
 * tela 16 do escopo seguem funcionando, e existe um desenho de formulário
 * só.
 */
export function CriarTopico({
  slug,
  nomeDaComunidade,
  jaUsouODia,
  /** `?nome=`, a sugestão de Primeiros passos. */
  nomeSugerido = "",
}: {
  slug: string;
  nomeDaComunidade: string;
  jaUsouODia: boolean;
  nomeSugerido?: string;
}) {
  const router = useRouter();
  const parametros = useSearchParams();

  /*
   * `?novo=1` é a fonte da verdade para quem **chega** com a janela aberta,
   * e o estado local serve ao botão.
   *
   * A primeira versão era `useState(abrirDeInicio)`, com o parâmetro vindo
   * do servidor, e os links de Primeiros passos não abriam nada: `useState`
   * inicializa uma vez por montagem, e clicar num `Link` para a **mesma**
   * rota é navegação de cliente — o componente recebe propriedade nova e
   * não remonta, então o valor inicial continuava `false`. Uma jornada
   * pegou.
   *
   * O ajuste é o padrão do React para estado que acompanha propriedade:
   * comparar com o visto da última vez, na renderização. Num efeito seria
   * um quadro com a janela errada na tela, e o lint recusa.
   */
  const naUrl = parametros.get("novo") === "1";
  const [visto, setVisto] = useState(naUrl);
  const [aberta, setAberta] = useState(naUrl);
  if (visto !== naUrl) {
    setVisto(naUrl);
    setAberta(naUrl);
  }

  function fechar() {
    setAberta(false);

    /*
     * Limpa `?novo=` e `?nome=` da barra de endereço, e **só quando eles
     * estão lá**: sem essa condição, fechar a janela custaria uma volta ao
     * servidor em toda comunidade do Hub. Com eles, recarregar a página
     * reabriria a janela que a pessoa acabou de fechar.
     */
    if (!naUrl && !parametros.has("nome")) return;

    const limpos = new URLSearchParams(parametros);
    limpos.delete("novo");
    limpos.delete("nome");
    const busca = limpos.toString();
    router.replace(busca ? `/c/${slug}?${busca}` : `/c/${slug}`, { scroll: false });
  }

  return (
    <>
      <Button size="sm" onClick={() => setAberta(true)}>
        <TopicStar className="size-icon" />
        Criar tópico
      </Button>

      <Janela titulo="Novo tópico" aberta={aberta} onFechar={fechar}>
        {/* Montado só quando abre: assim cada abertura começa limpa, em vez
            de guardar o que foi escrito e desistido na vez anterior. */}
        {aberta ? (
          <FormularioNovoTopico
            comunidadeSlug={slug}
            nomeDaComunidade={nomeDaComunidade}
            jaUsouODia={jaUsouODia}
            nomeSugerido={nomeSugerido}
          />
        ) : null}
      </Janela>
    </>
  );
}
