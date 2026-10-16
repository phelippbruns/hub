import Link from "next/link";
import { pedacosComMencoes } from "@/lib/texto/mencoes";

/**
 * Texto de usuário com os @ virando link (F15).
 *
 * `existentes` vem do servidor, já conferido no banco. Quem não está na
 * lista fica **texto comum**: um @ de ninguém não pode virar link quebrado,
 * e o Hub não deve inventar que aquela pessoa existe.
 *
 * Continua sendo texto, nunca HTML vindo de quem escreveu (regra de
 * segurança 8): o que sai daqui são `<span>` e `<Link>` montados por nós, e
 * o conteúdo entra como filho de elemento React, que o React escapa.
 */
export function TextoComMencoes({ texto, existentes }: { texto: string; existentes: string[] }) {
  const conhecidos = new Set(existentes);
  const pedacos = pedacosComMencoes(texto, conhecidos);

  return (
    <>
      {pedacos.map((pedaco, i) =>
        pedaco.tipo === "texto" ? (
          <span key={i}>{pedaco.valor}</span>
        ) : (
          <Link key={i} href={`/${pedaco.handle}`} className="text-ink font-semibold">
            {pedaco.trecho}
          </Link>
        ),
      )}
    </>
  );
}
