import Link from "next/link";
import { cn } from "../cn";

/**
 * O `@` de uma pessoa, que **sempre leva ao perfil dela**.
 *
 * Pedido do PO em 12 de novembro de 2026: "o @ dos usuários é sempre um
 * link". Até ali eram quinze lugares escrevendo `@{handle}` à mão, e só
 * cinco deles levavam a algum lugar — no cabeçalho de toda contribuição, o
 * avatar ao lado já era link e o @ não era.
 *
 * O perfil mora na raiz (`/lia`), e é por isso que este componente não
 * precisa de `lib/rotas.ts`: não há duas formas do endereço, como há no
 * tópico e no post.
 *
 * **Onde ele não pode entrar**, e é de propósito: dentro de algo que já é
 * clicável. O `@` do cartão de tópico está dentro do link que abre o
 * tópico, e o da lista de Cabines está dentro do botão que abre a conversa
 * — âncora dentro de âncora é HTML inválido, e o navegador desfaz do jeito
 * dele. Nesses dois o `@` continua texto, e quem leva ao perfil é o avatar.
 */
export function HandleLink({
  handle,
  className,
}: {
  /** Sem o `@`: ele é desenhado aqui. */
  handle: string;
  className?: string;
}) {
  return (
    <Link
      href={`/${handle}`}
      /*
        O mesmo traço das menções dentro de texto
        (`features/notificacoes/texto-marcado.tsx`): o `@` é a mesma coisa
        nos dois lugares, e duas aparências ensinariam que não é.
      */
      className={cn("text-ink font-semibold hover:underline", className)}
    >
      @{handle}
    </Link>
  );
}
