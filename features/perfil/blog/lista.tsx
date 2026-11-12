import { EmptyState } from "@/design/components";

/**
 * A aba Blog do perfil (RN39).
 *
 * **Mora em `features/perfil/` e não numa feature própria** por causa da
 * regra do projeto: uma feature não importa de outra. O blog é desenhado
 * dentro da tela de perfil, então uma pasta `features/blog/` obrigaria
 * `features/perfil/tela.tsx` a importar dela. E a escolha também é honesta
 * sobre o produto: o blog não tem tela própria — ele é uma aba do perfil, e
 * o endereço canônico do post só redireciona para cá.
 */
export function AbaBlog({ souEu }: { souEu: boolean }) {
  return (
    <EmptyState
      title="Nenhum post ainda"
      description={
        souEu
          ? "Escreva o primeiro: o blog é o que você pensa, não o que você responde."
          : "Quando esta pessoa escrever, os posts aparecem aqui."
      }
    />
  );
}
