"use client";

/**
 * Ícones de navegação: casa, busca, # em quadrado, balão com reticências,
 * pessoa e sino.
 *
 * Regra do design system, a partir do ícone de Perfil:
 * - inativo: contorno de 2 px;
 * - ativo: a silhueta preenchida, com os detalhes internos **vazados por
 *   máscara**. O vazado deixa o fundo aparecer, então o mesmo desenho funciona
 *   em fundo claro e escuro, sem uma segunda versão do ícone.
 *
 * A máscara precisa de um id único por instância, e `useId` é um hook: por isso
 * este módulo é de cliente. A geometria vem do protótipo (tela 29).
 */
import { useId, type ReactNode } from "react";
import type { IconProps } from "./icon";

type NavIconProps = IconProps & {
  /** Estado do item na navegação. */
  active?: boolean;
};

type NavShapeProps = {
  /** Silhueta: contornada quando inativa, preenchida quando ativa. */
  silhouette: ReactNode;
  /** Detalhes vazados da silhueta quando ativa (traço de 2 px). */
  cutStroke?: ReactNode;
  /** Detalhes vazados preenchidos quando ativa. */
  cutFill?: ReactNode;
  /** Partes que ficam sempre em contorno, dentro e fora da silhueta. */
  outside?: ReactNode;
};

function NavIcon({
  active = false,
  label,
  decorative,
  silhouette,
  cutStroke,
  cutFill,
  outside,
  ...props
}: NavIconProps & NavShapeProps) {
  const maskId = useId();

  return (
    <svg
      viewBox="0 0 24 24"
      width={24}
      height={24}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={decorative || !label ? true : undefined}
      role={label ? "img" : undefined}
      aria-label={label}
      {...props}
    >
      {label ? <title>{label}</title> : null}

      {active ? (
        <>
          <defs>
            <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="24" height="24">
              {/* Branco mostra, preto vaza. */}
              <rect width="24" height="24" fill="#fff" />
              {cutStroke ? (
                <g fill="none" stroke="#000" strokeWidth={2}>
                  {cutStroke}
                </g>
              ) : null}
              {cutFill ? <g fill="#000">{cutFill}</g> : null}
            </mask>
          </defs>
          <g mask={`url(#${maskId})`} fill="currentColor" stroke="currentColor" strokeWidth={2}>
            {silhouette}
          </g>
        </>
      ) : (
        <g fill="none" stroke="currentColor" strokeWidth={2}>
          {silhouette}
          {cutStroke}
        </g>
      )}

      {!active && cutFill ? (
        <g fill="currentColor" stroke="none">
          {cutFill}
        </g>
      ) : null}

      {outside ? (
        <g fill="none" stroke="currentColor" strokeWidth={2}>
          {outside}
        </g>
      ) : null}
    </svg>
  );
}

export function HomeNavIcon(props: NavIconProps) {
  return <NavIcon {...props} silhouette={<path d="M3.5 11 12 3.8l8.5 7.2v9.5h-6v-6h-5v6h-6z" />} />;
}

export function ExploreNavIcon(props: NavIconProps) {
  return (
    <NavIcon
      {...props}
      silhouette={<circle cx="10.5" cy="10.5" r="6.5" />}
      // A lente vazada é menor que o aro, para o aro continuar lendo como aro.
      cutStroke={<circle cx="10.5" cy="10.5" r="4.3" strokeWidth={1.5} />}
      outside={<path d="M15.5 15.5 20.5 20.5" />}
    />
  );
}

export function CommunitiesNavIcon(props: NavIconProps) {
  return (
    <NavIcon
      {...props}
      silhouette={<rect x="3.5" y="3.5" width="17" height="17" rx="4.5" />}
      cutStroke={<path d="M10.3 7.6 9.4 16.4M14.6 7.6l-.9 8.8M7.6 10.5h9.3M7.1 13.5h9.3" />}
    />
  );
}

export function CabinNavIcon(props: NavIconProps) {
  return (
    <NavIcon
      {...props}
      silhouette={
        <path d="M6.5 4h11a3 3 0 0 1 3 3v6.5a3 3 0 0 1-3 3h-6.8l-4.7 4v-4a3 3 0 0 1-2.5-3V7a3 3 0 0 1 3-3z" />
      }
      cutFill={
        <>
          <circle cx="8" cy="10.25" r="1.4" />
          <circle cx="12" cy="10.25" r="1.4" />
          <circle cx="16" cy="10.25" r="1.4" />
        </>
      }
    />
  );
}

export function ProfileNavIcon(props: NavIconProps) {
  return (
    <NavIcon
      {...props}
      silhouette={
        <>
          <circle cx="12" cy="8.2" r="4.2" />
          <path d="M3.5 20.5c1-4.2 4.3-6.3 8.5-6.3s7.5 2.1 8.5 6.3z" />
        </>
      }
    />
  );
}

export function NotificationsNavIcon(props: NavIconProps) {
  return (
    <NavIcon
      {...props}
      silhouette={<path d="M6 16.5v-5a6 6 0 0 1 12 0v5l2.5 2.5h-17z" />}
      outside={<path d="M10 21.5h4" />}
    />
  );
}
