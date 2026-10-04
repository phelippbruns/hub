/**
 * GERADO POR scripts/generate-tokens.mts — NÃO EDITE À MÃO.
 * Fonte: docs/design-system/tokens.json. Para mudar um valor, mude o JSON e rode `npm run tokens`.
 */

/** Cores do Hub. Cada nível da hierarquia tem a sua, fixa em toda a rede. */
export const color = {
  /** Texto principal, botão primário, cartão da pergunta, barra de navegação ativa. 14,7:1 sobre surfacePage; 16,8:1 sobre paper; 7,0:1 sobre lavender; 12,3:1 sobre sun. */
  ink: "#1E1A33",
  /** Texto secundário, metadados, glifos de canal (#) e tópico (*), contorno de chip não selecionado. 6,6:1 sobre surfacePage; 7,5:1 sobre paper. Sobre lavender só 3,1:1: use apenas em texto de 24px ou mais. */
  inkMuted: "#565170",
  /** Cartões de post, campos, chips não selecionados, fundo da barra de navegação. Nunca como texto sobre lavender (2,4:1, reprova). */
  paper: "#FFFFFF",
  /** Fundo de página em todas as telas. */
  surfacePage: "#F1EEFF",
  /** Chip selecionado, botão de ícone, selo de posição no ciclo, marca de Universo secundária. Texto sobre ela sempre em ink. Contra surfacePage tem só 2,1:1, então estado selecionado precisa de um segundo sinal além da cor (o ✓ do chip). */
  lavender: "#A69CFB",
  /** Destaque do ciclo: selo Em destaque, botão Responder dentro do cartão de destaque, aviso de ação pendente. Texto sobre ela em ink. Nunca como cor de texto. */
  sun: "#FFD95E",
  /** Divisores decorativos entre linhas de lista. Contraste 1,3:1 com surfacePage: não serve como borda de controle. */
  line: "#D4CEF2",
  /** Mensagens de erro, ação destrutiva (excluir conta, remover, sair). 6,6:1 sobre paper. Sempre acompanhado de ícone ou texto, nunca só a cor. */
  error: "#B42318",
  /** Confirmação de ação concluída (tópico criado, resposta enviada). 6,4:1 sobre paper. */
  success: "#146C43",
} as const;

export type ColorName = keyof typeof color;

/** Escala tipográfica. Uma família só: Bricolage Grotesque. */
export const typography = {
  /** A marca na tela de abertura. Só ali. */
  brand: {
    fontSize: "88px",
    lineHeight: "80px",
    fontWeight: 800,
    letterSpacing: "-0.04em",
  },
  /** Título de tela. */
  title: {
    fontSize: "28px",
    lineHeight: "32px",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  /** Pergunta de abertura do tópico em destaque. */
  question: {
    fontSize: "22px",
    lineHeight: "26px",
    fontWeight: 800,
    letterSpacing: "-0.02em",
  },
  /** Nome de comunidade e de Universo no cabeçalho. */
  subtitle: {
    fontSize: "20px",
    lineHeight: "26px",
    fontWeight: 700,
    letterSpacing: "-0.01em",
  },
  /** Texto de post e de mensagem. */
  body: {
    fontSize: "15px",
    lineHeight: "22px",
    fontWeight: 400,
  },
  /** Rótulo de botão, nome de autor. */
  bodyStrong: {
    fontSize: "15px",
    lineHeight: "22px",
    fontWeight: 600,
  },
  /** Chips, abas, rótulos de seção. */
  label: {
    fontSize: "13px",
    lineHeight: "18px",
    fontWeight: 600,
  },
  /** Metadados, legenda da barra de navegação. */
  caption: {
    fontSize: "12px",
    lineHeight: "16px",
    fontWeight: 500,
  },
} as const;

export type TypographyName = keyof typeof typography;

/** Grade de 8 px. */
export const spacing = {
  /** Entre ícone e rótulo. */
  space1: "4px",
  /** Entre chips; entre itens de uma linha. */
  space2: "8px",
  /** Respiro interno de cartão; margem lateral de tela. */
  space3: "16px",
  /** Entre blocos de uma tela. */
  space4: "24px",
} as const;

export const radius = {
  /** Chips, campos de texto curtos, marca de Universo, cartões de post. */
  radiusSm: "12px",
  /** Cartão da pergunta e cartões de destaque. */
  radiusMd: "18px",
  /** Botões, busca, abas da Cabine. */
  radiusPill: "999px",
  /** Caixa de seleção. radiusSm (12px) num quadrado de 20px vira círculo, e caixa redonda se confunde com botão de opção. */
  radiusControl: "6px",
} as const;

/**
 * Medidas dos controles. Ficam no mesmo namespace de espaçamento do Tailwind,
 * então viram utilitário: `size-mark`, `h-toggleH`, `max-w-contentColumn`.
 */
export const size = {
  /** Ícone dentro de mensagem de erro, sucesso ou caixa de seleção. */
  iconSm: "16px",
  /** Ícone padrão, ao lado de texto. */
  icon: "22px",
  /** Ícone da barra de navegação. É também a grade em que todos os ícones são desenhados. */
  iconNav: "24px",
  /** Ícone grande, em estado vazio e cabeçalho. */
  iconLg: "34px",
  /** Marca de nível ({, #, asterisco) e o botão # de entrar e sair da comunidade. */
  mark: "32px",
  /** Botão só de ícone. */
  control: "42px",
  /** Botão de ícone redondo, em cabeçalho e barra. */
  controlSm: "36px",
  /** Foto de perfil em linha de lista. */
  avatar: "30px",
  /** Foto de perfil em cartão de resposta e mensagem. */
  avatarMd: "40px",
  /** Foto de perfil na página de perfil. */
  avatarLg: "72px",
  /** Miniatura da capa da comunidade, no lugar da marca # nas listas. */
  thumb: "36px",
  /** Largura do interruptor. */
  toggleW: "40px",
  /** Altura do interruptor. */
  toggleH: "24px",
  /** Botão que desliza dentro do interruptor. */
  toggleKnob: "18px",
  /** Caixa de seleção. */
  checkbox: "20px",
  /** Largura da coluna de conteúdo na web. Tópico e página da comunidade usam a largura total. */
  contentColumn: "720px",
  /** Coluna das telas de entrada (login, cadastro, recuperação de senha), mais estreita que a de conteúdo. */
  authColumn: "420px",
} as const;

export const fontFamily =
  '"Bricolage Grotesque", system-ui, -apple-system, "Segoe UI", sans-serif' as const;
