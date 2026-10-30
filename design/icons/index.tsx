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

/** Fechar: o X do painel do tópico e das folhas. */
export function CloseIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
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

/**
 * O olho com um tique dentro: "você já segue".
 *
 * É o `FollowIcon` com a pupila trocada pelo tique — mesma amêndoa, mesmo
 * traço. Importa que seja o mesmo desenho: ligado e desligado precisam ser
 * reconhecíveis como **o mesmo botão em dois estados**, e não dois botões.
 *
 * Existe porque o estado de seguir, no perfil, virou um botão só de ícone:
 * sem rótulo ao lado, a diferença não pode ser só a cor de fundo.
 */
export function FollowingIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <path d="m9.5 12 2 2 3.5-3.5" />
    </IconBase>
  );
}

/** Alfinete, para fixar uma comunidade no topo da lista. */
export function PinIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <path d="M9 4h6l-1 5 3 3v2H7v-2l3-3-1-5Z" />
      <path d="M12 14v6" />
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

/**
 * Engrenagem, com os dentes no contorno em vez de raios soltos.
 *
 * O desenho anterior era um círculo com oito risquinhos em volta; em 24 px
 * ele lia como sol. A geometria agora é a da referência do menu lateral.
 */
export function SettingsIcon(props: IconProps) {
  return (
    <IconBase {...props}>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </IconBase>
  );
}
