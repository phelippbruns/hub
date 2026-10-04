import type { ReactNode } from "react";

/**
 * Layout das telas de entrada.
 *
 * Item 8 da F03: estas telas ficam **sem a navegação do app**. Quem ainda não
 * entrou não tem Início, comunidades nem perfil para navegar.
 *
 * Coluna de 420 px centralizada, como a versão web do protótipo (telas 1, 3 e 4).
 */
export default function EntradaLayout({ children }: { children: ReactNode }) {
  return (
    <div className="bg-surfacePage flex min-h-screen flex-col items-center px-4 py-4">
      <div className="max-w-authColumn flex w-full flex-1 flex-col">{children}</div>
    </div>
  );
}
