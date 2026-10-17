import type { Metadata } from "next";
import { ContentColumn, PageTitle } from "@/design/components";
import { EscolherPessoas } from "@/features/cabines/escolher-pessoas";
import { getViewer } from "@/lib/auth/session";
import { sugestoesParaConvidar } from "@/lib/data/cabins";

export const metadata: Metadata = { title: "Nova Cabine · Hub" };

/**
 * Tela 18: nova Cabine (RN20, RN21, RN22, RN23).
 *
 * Dois caminhos chegam aqui com contexto, e os dois precisam ser atendidos:
 * `?com=<@>` vem do botão Cabine de um perfil, e marca aquela pessoa;
 * `?cabine=<id>` vem do menu de uma Cabine, e manda o convite **para ela**,
 * em vez de abrir outra conversa.
 */
export default async function NovaCabinePage({
  searchParams,
}: {
  searchParams: Promise<{ com?: string; cabine?: string }>;
}) {
  const { com, cabine } = await searchParams;
  const viewer = await getViewer();
  const pessoas = await sugestoesParaConvidar(viewer);

  // O `@` da URL só vira seleção se aquela pessoa puder mesmo ser convidada.
  const preSelecionada = com ? pessoas.find((pessoa) => pessoa.handle === com)?.id : undefined;

  return (
    <ContentColumn>
      <PageTitle>{cabine ? "Convidar pessoas" : "Nova Cabine"}</PageTitle>
      <p className="text-caption text-inkMuted">
        {cabine
          ? "Elas precisam aceitar. Quem aceitar entra nesta Cabine."
          : "Com quem se segue com você, a conversa começa agora. As outras pessoas recebem um convite."}
      </p>
      <EscolherPessoas
        pessoas={pessoas.map((pessoa) => ({
          id: pessoa.id,
          nome: pessoa.nome,
          handle: pessoa.handle,
          emComum: pessoa.emComum,
          seSegue: pessoa.seSegue,
        }))}
        preSelecionada={preSelecionada}
        cabine={cabine}
      />
    </ContentColumn>
  );
}
