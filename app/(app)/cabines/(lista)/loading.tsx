import { ContentColumn, PaginaCarregando } from "@/design/components";

/**
 * Toda rota renderiza por requisição; sem isto a tela anterior fica parada.
 *
 * Este arquivo mora no grupo `(lista)` para cobrir **só** `/cabines`. Um
 * `loading.tsx` um nível acima também cobriria `/cabines/<id>`, que chama
 * `notFound()` — e aí o cabeçalho sai como 200 antes de a página decidir,
 * então a Cabine de outra pessoa passaria a dizer que existe. Foi o que
 * aconteceu quando a lista ganhou a segunda coluna.
 */
export default function Carregando() {
  return (
    <ContentColumn>
      <PaginaCarregando label="Carregando suas Cabines" linhas={3} />
    </ContentColumn>
  );
}
