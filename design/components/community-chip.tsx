import Link from "next/link";
import { LevelMark } from "./level-mark";

/**
 * A comunidade de onde o tópico veio, em pílula, no alto da tela dele
 * (protótipo v6).
 *
 * Era uma linha de texto cinza e pequena. Virou pílula porque **é a saída**:
 * quem abre um tópico por link chega sem contexto nenhum, e o caminho de
 * volta para a comunidade precisa parecer clicável antes de alguém tentar.
 *
 * O nome trunca em vez de quebrar: aqui ele é referência, não conteúdo, e
 * uma pílula de três linhas empurraria os botões do lado para fora.
 */
export function CommunityChip({ nome, href }: { nome: string; href: string }) {
  return (
    <Link
      href={href}
      className="bg-surfacePage text-ink hover:bg-lavenderSoft h-btnRound inline-flex min-w-0 items-center gap-2 rounded-pill py-0 pr-3 pl-1 no-underline"
    >
      <LevelMark level="community" />
      <span className="text-bodyStrong truncate">{nome}</span>
    </Link>
  );
}
