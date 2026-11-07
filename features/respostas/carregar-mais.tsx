"use client";

import { useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/design/components";
import { CONTRIBUICOES_POR_VEZ } from "./shared";

/**
 * Mais 20 contribuições (protótipo v6, item 10.1).
 *
 * **É um botão de verdade, que a rolagem aperta.** O protótipo pede
 * "carrega 20 por vez ao rolar", e a forma ingênua disso — um observador
 * que busca sozinho, sem controle nenhum na tela — não existe para quem
 * navega por teclado e não existe se o JavaScript falhar. Aqui o botão é
 * o elemento observado: quem rola não o vê funcionar, quem usa Tab o
 * encontra, e os dois caminhos levam ao mesmo lugar.
 *
 * **A quantidade vai na URL** (`?ate=`), como a ordem. Assim a página
 * continua sendo desenhada pelo servidor, o botão voltar funciona, e
 * recarregar não perde o que já tinha chegado.
 *
 * O que isso custa: carregar mais **recalcula a ordem**, porque é uma
 * nova renderização. Uma contribuição que ganhou estrelas nesse meio
 * tempo pode mudar de lugar. É o mesmo que o item 5.5 já permite — "a
 * ordem é recalculada ao carregar a página" —, e a alternativa seria
 * guardar a lista inteira no navegador para costurar as páginas à mão.
 */
export function CarregarMais({ quantas }: { quantas: number }) {
  const router = useRouter();
  const parametros = useSearchParams();
  const caixa = useRef<HTMLDivElement>(null);
  const jaPediu = useRef(false);

  function pedirMais() {
    // Uma vez por página desenhada: o observador dispara várias vezes
    // enquanto o botão atravessa a tela, e cada uma seria uma navegação.
    if (jaPediu.current) return;
    jaPediu.current = true;

    const novos = new URLSearchParams(parametros.toString());
    novos.set("ate", String(quantas + CONTRIBUICOES_POR_VEZ));
    router.push(`?${novos.toString()}`, { scroll: false });
  }

  useEffect(() => {
    const alvo = caixa.current;
    if (!alvo || typeof IntersectionObserver === "undefined") return;

    const observador = new IntersectionObserver(
      (entradas) => {
        if (entradas.some((entrada) => entrada.isIntersecting)) pedirMais();
      },
      // Pede antes de o botão aparecer: a próxima página chega enquanto
      // ainda há o que ler, em vez de parar a leitura para esperar.
      { rootMargin: "400px" },
    );
    observador.observe(alvo);
    return () => observador.disconnect();
    // `pedirMais` só usa refs e o router; recriá-la a cada parâmetro
    // reiniciaria o observador sem motivo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quantas]);

  return (
    <div ref={caixa} className="flex justify-center">
      <Button variant="secondary" size="sm" onClick={pedirMais}>
        Carregar mais contribuições
      </Button>
    </div>
  );
}
