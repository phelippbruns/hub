import type { ReactNode, SVGProps } from "react";

/**
 * Base de todos os ícones: traço de 2 px numa grade de 24 px, em currentColor.
 *
 * Acessibilidade: ou o ícone tem `label` (e vira `role="img"` com nome), ou é
 * decorativo e some para o leitor de tela. O tipo `IconProps` obriga a escolher,
 * então ícone sem texto nunca fica mudo.
 */
type IconBaseProps = SVGProps<SVGSVGElement> & {
  children: ReactNode;
  /** Nome lido pelo leitor de tela. Omita só quando um texto ao lado já nomeia a ação. */
  label?: string;
  /** Marque quando o ícone só acompanha um texto que já diz o que ele significa. */
  decorative?: boolean;
};

export function IconBase({ children, label, decorative, ...props }: IconBaseProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative || !label ? true : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      {...props}
    >
      {label ? <title>{label}</title> : null}
      {children}
    </svg>
  );
}

export type IconProps = Omit<IconBaseProps, "children">;
