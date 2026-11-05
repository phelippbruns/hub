"use client";

import Link from "next/link";
import { useTransition, type ReactNode } from "react";
import { atenderNotificacao } from "./actions";

/**
 * Um aviso da central (tela 8), clicável.
 *
 * **Continua um `<Link>` de verdade.** Trocá-lo por um botão que navega
 * mataria o clique do meio e o "abrir em nova aba", que é como muita gente
 * lê uma lista: abre três e volta. Por isso a ação de marcar roda **ao
 * lado** da navegação, sem `preventDefault`.
 *
 * Isso funciona porque o destino é sempre interno: o Next navega por
 * cliente, a página não é derrubada, e a ação termina. Num link externo
 * seria uma corrida — e aqui não existe aviso que aponte para fora.
 *
 * `onMouseDown` além de `onClick`: o clique do meio não dispara `onClick`
 * em todos os navegadores, e abrir em nova aba também é atender. O servidor
 * ignora a segunda chamada, porque a marca só é gravada quando ainda está
 * vazia.
 */
export function AvisoClicavel({
  id,
  href,
  className,
  children,
}: {
  id: string;
  href: string;
  className?: string;
  children: ReactNode;
}) {
  const [, iniciar] = useTransition();

  function atender() {
    iniciar(async () => {
      try {
        await atenderNotificacao(id);
      } catch {
        // Falhar aqui não pode atrapalhar a navegação: o pior que acontece
        // é o aviso continuar no topo até o próximo clique.
      }
    });
  }

  return (
    <Link href={href} className={className} onClick={atender} onMouseDown={atender}>
      {children}
    </Link>
  );
}
