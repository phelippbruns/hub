import type { ReactNode } from "react";

/**
 * Layout da apresentação do Hub.
 *
 * Sem a navegação do app, como as telas de entrada — mas **sem a coluna de
 * 420 px delas**: a apresentação tem duas colunas por card e precisa da
 * largura toda. Por isso é um grupo de rotas próprio em vez de um ajuste
 * dentro de `(entrada)`, que estreitaria o carrossel ou alargaria o login.
 */
export default function ApresentacaoLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surfacePage flex min-h-screen flex-col items-center px-5 py-4">
      {children}
    </div>
  );
}
