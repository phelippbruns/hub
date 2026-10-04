/**
 * Ícones do Hub. Traço de 2 px numa grade de 24 px, desenhados em currentColor.
 * A geometria vem do protótipo (docs/telas.html, tela 29).
 */
import { IconBase, type IconProps } from "./icon";

export { IconBase, type IconProps } from "./icon";
export * from "./nav";
export * from "./marks";

export function MoreAnswersIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 6h16M4 12h11M4 18h6" />
    </IconBase>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="11" cy="11" r="6" />
      <path d="M20 20l-4.5-4.5" />
    </IconBase>
  );
}

export function CreateIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 5v14M5 12h14" />
    </IconBase>
  );
}

export function BackIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M15 5l-7 7 7 7" />
    </IconBase>
  );
}

export function ForwardIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 5l7 7-7 7" />
    </IconBase>
  );
}

export function MoreOptionsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="5" cy="12" r="1.2" />
      <circle cx="12" cy="12" r="1.2" />
      <circle cx="19" cy="12" r="1.2" />
    </IconBase>
  );
}

/** O olho que segue tópicos e pessoas. O mesmo nos dois casos. */
export function FollowIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" fill="none" />
    </IconBase>
  );
}

export function ShareIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M12 15V4M7 9l5-5 5 5" />
      <path d="M5 13v6h14v-6" />
    </IconBase>
  );
}

export function CopyLinkIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 15l6-6" />
      <path d="M10.5 6.5l1.2-1.2a4 4 0 0 1 5.7 5.7l-1.2 1.2" />
      <path d="M13.5 17.5l-1.2 1.2a4 4 0 0 1-5.7-5.7l1.2-1.2" />
    </IconBase>
  );
}

export function ImageIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <path d="M4 16l5-5 4 4 3-3 4 4" />
    </IconBase>
  );
}

/** Mesmo tamanho do ícone de imagem, como pede o design system. */
export function GifIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="4" y="5" width="16" height="14" rx="2" />
      <text
        x="12"
        y="14.6"
        fontSize="6.6"
        fontWeight="800"
        textAnchor="middle"
        fill="currentColor"
        stroke="none"
      >
        GIF
      </text>
    </IconBase>
  );
}

export function SendIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M4 12l16-8-6 16-3-7z" />
    </IconBase>
  );
}

/** Relógio: ordem cronológica, inclusive na Coleção. */
export function ChronologicalIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </IconBase>
  );
}

export function ConfirmedIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 12l5 5 9-10" />
    </IconBase>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v5M12 16v.5" />
    </IconBase>
  );
}

export function ReportIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M5 21V4h11l-2 4 2 4H5" />
    </IconBase>
  );
}

export function BlockIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <rect x="6" y="11" width="12" height="9" rx="2" />
      <path d="M9 11V8a3 3 0 0 1 6 0v3" />
    </IconBase>
  );
}

export function LeaveIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
    </IconBase>
  );
}

export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3.5" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M5.6 18.4l2.1-2.1M16.3 7.7l2.1-2.1" />
    </IconBase>
  );
}
