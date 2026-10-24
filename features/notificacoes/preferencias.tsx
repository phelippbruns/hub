"use client";

import { useTransition } from "react";
import { SwitchRow } from "@/design/components";
import { salvarPreferencia } from "./actions";

export type Preferencias = {
  notifyTopicBecameHot: boolean;
  notifyCabin: boolean;
  notifyFollowedTopics: boolean;
  notifyMention: boolean;
  notifyNewTopicInCommunity: boolean;
};

/**
 * Os interruptores de notificação (RN34).
 *
 * Cada um diz **o que acontece**, não o nome do tipo: "Seu tópico virou Hot
 * Topic" em vez de "Hot Topic". A pessoa está decidindo sobre o aviso que
 * vai receber, não sobre uma categoria do sistema.
 *
 * A ordem não é alfabética: primeiro o que chega por padrão, por último o
 * que está desligado. Quem abre esta tela quase sempre quer desligar algo.
 */
const INTERRUPTORES: {
  campo: keyof Preferencias;
  rotulo: string;
  apoio: string;
  /*
   * O valor vem por função, e não por `atuais[campo]`.
   *
   * Ler um objeto com chave em variável acende o aviso de injeção no lint,
   * e ele tem razão em princípio: nada garante que a chave seja uma das
   * cinco. Uma função por linha resolve com tipo, sem suprimir regra.
   */
  valor: (p: Preferencias) => boolean;
}[] = [
  {
    campo: "notifyCabin",
    valor: (p) => p.notifyCabin,
    rotulo: "Cabine",
    apoio: "Convites para conversar e mensagens novas.",
  },
  {
    campo: "notifyMention",
    valor: (p) => p.notifyMention,
    rotulo: "Quando alguém te marca",
    apoio: "Alguém escreveu @você numa resposta ou num tópico.",
  },
  {
    campo: "notifyTopicBecameHot",
    valor: (p) => p.notifyTopicBecameHot,
    rotulo: "Seu tópico virou Hot Topic",
    apoio: "O ciclo vira às 00h e elege o tópico mais respondido.",
  },
  {
    campo: "notifyFollowedTopics",
    valor: (p) => p.notifyFollowedTopics,
    rotulo: "Resumo dos tópicos que você segue",
    apoio: "Um aviso por dia, com tudo que chegou junto.",
  },
  {
    campo: "notifyNewTopicInCommunity",
    valor: (p) => p.notifyNewTopicInCommunity,
    rotulo: "Novos tópicos nas comunidades",
    apoio: "Desligado por padrão: uma comunidade ativa abre vários por dia.",
  },
];

export function PreferenciasDeNotificacao({ atuais }: { atuais: Preferencias }) {
  const [pendente, iniciar] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {INTERRUPTORES.map(({ campo, rotulo, apoio, valor }) => (
        <SwitchRow
          key={campo}
          nome={rotulo}
          descricao={apoio}
          checked={valor(atuais)}
          onToggle={() => {
            if (pendente) return;
            const formulario = new FormData();
            formulario.set("campo", campo);
            formulario.set("ligado", valor(atuais) ? "nao" : "sim");
            iniciar(() => salvarPreferencia(formulario));
          }}
        />
      ))}
    </div>
  );
}
