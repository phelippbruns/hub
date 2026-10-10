import { permanentRedirect } from "next/navigation";
import { enderecoDoTopico } from "@/lib/data/topics";

/**
 * O endereço antigo de um tópico, por id.
 *
 * A URL de verdade é `/c/<comunidade>/<topico>` (tela 15). Esta rota continua
 * existindo porque **os convites da F04 apontam para cá**: quem recebeu um
 * link antes da F08 não pode cair num 404 por uma mudança nossa.
 *
 * `permanentRedirect` porque a mudança é definitiva — e assim o navegador e
 * os buscadores param de pedir o endereço antigo.
 */
export default async function TopicoPorIdPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  // Tópico que não existe mais volta para Explorar, não para um 404: quem
  // clicou num convite antigo merece um lugar para onde ir.
  permanentRedirect((await enderecoDoTopico(id)) ?? "/comunidades");
}
