import { redirect } from "next/navigation";

/**
 * Tela 16: criar tópico na comunidade (RN07).
 *
 * **O formulário saiu daqui e virou janela** sobre a comunidade, por
 * correção do PO em 31 de outubro — ele mora em
 * [features/topicos/criar.tsx](../../../../../features/topicos/criar.tsx).
 *
 * O endereço continua existindo, e redireciona. Endereço que já foi
 * compartilhado nunca vira 404: o atalho da barra lateral, os links de
 * Primeiros passos e a tela 16 do escopo apontam para cá, e quem chega vê
 * a comunidade com a janela aberta em cima — nunca uma tela órfã.
 *
 * A conferência de que a comunidade existe não é feita aqui: a página de
 * destino já a faz, e duplicá-la custaria uma consulta a cada redirecionamento.
 */
export default async function NovoTopicoPage({
  params,
  searchParams,
}: {
  params: Promise<{ comunidade: string }>;
  /** `?nome=` vem das sugestões de Primeiros passos. */
  searchParams: Promise<{ nome?: string }>;
}) {
  const { comunidade: slug } = await params;
  const { nome } = await searchParams;

  const busca = new URLSearchParams({ novo: "1" });
  if (nome) busca.set("nome", nome.slice(0, 80));

  redirect(`/c/${encodeURIComponent(slug)}?${busca.toString()}`);
}
