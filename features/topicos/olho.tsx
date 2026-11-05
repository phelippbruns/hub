"use client";

import { useTransition } from "react";
import { useState } from "react";
import { FollowButton } from "@/design/components";
import { alternarSeguirTopico } from "./actions";

/**
 * O olho de seguir o tópico, dentro do cartão escuro (protótipo v6).
 *
 * Mora sozinho num arquivo porque o cartão é desenhado pelo **servidor**
 * (`CorpoDoTopico`) e o olho precisa de estado: a página monta este
 * componente e o entrega ao cartão como `seguir`. Era código repetido na
 * página inteira e no painel, e já tinha divergido uma vez.
 *
 * RN18: seguir é sempre manual — contribuir não segue o tópico.
 *
 * Otimista, no padrão do Hub: o olho acende na hora e volta atrás se o
 * servidor recusar. Sem isso o clique parece não ter funcionado até a
 * requisição voltar.
 */
export function OlhoDoTopico({
  topicId,
  nome,
  endereco,
  seguindoInicial,
}: {
  topicId: string;
  nome: string;
  endereco: string;
  seguindoInicial: boolean;
}) {
  const [visto, setVisto] = useState(seguindoInicial);
  const [seguindo, setSeguindo] = useState(seguindoInicial);
  const [pendente, iniciar] = useTransition();

  /*
   * Navegar de um tópico para outro reaproveita este componente **sem
   * desmontá-lo**, e o `useState` só lê o valor inicial na montagem: sem
   * esta conferência, o olho do tópico anterior continuava aceso no
   * próximo. Mesmo erro do botão de entrar na comunidade, em novembro.
   */
  if (visto !== seguindoInicial) {
    setVisto(seguindoInicial);
    setSeguindo(seguindoInicial);
  }

  function alternar() {
    const estava = seguindo;
    setSeguindo(!estava);
    iniciar(async () => {
      try {
        await alternarSeguirTopico(topicId, estava, endereco);
      } catch {
        setSeguindo(estava);
      }
    });
  }

  return (
    <FollowButton
      seguindo={seguindo}
      oQue={`o tópico ${nome}`}
      tom="escuro"
      onToggle={pendente ? undefined : alternar}
    />
  );
}
