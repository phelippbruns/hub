/**
 * Validação de entrada da camada de dados (regra de segurança 4).
 *
 * Toda entrada é validada aqui, no servidor, mesmo que a tela já valide. A tela
 * é conveniência; isto é a regra.
 */
import { z } from "zod";

/**
 * RN16: links são bloqueados em todo texto, **inclusive endereços digitados
 * por extenso**. Por isso não basta procurar "http": `meusite.com` também é
 * link para a regra.
 *
 * A lista de domínios de topo é curta de propósito — pegar os casos comuns sem
 * transformar "etc.pode" em link. Palavra com ponto seguido de domínio
 * conhecido, ou qualquer esquema de URL, é recusada.
 */
const URL_SCHEME = /\b[a-z][a-z0-9+.-]*:\/\//i;
// Sem quantificador aninhado: `[a-z0-9][a-z0-9-]*` é linear. A versão com
// `(?:[a-z0-9-]*[a-z0-9])?` retrocedia em tempo quadrático numa string longa
// sem casamento — e isto roda em todo texto que a pessoa escreve.
const BARE_DOMAIN =
  /\b[a-z0-9][a-z0-9-]*\.(com|br|net|org|io|co|app|dev|me|gg|tv|xyz|link|site|info|st|ly)\b/i;
const AT_DOMAIN = /\b[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}\b/i;

export function containsLink(value: string): boolean {
  return URL_SCHEME.test(value) || BARE_DOMAIN.test(value) || AT_DOMAIN.test(value);
}

/** Texto de usuário: sem links, sem espaço sobrando, com limite de tamanho. */
export function userText(max: number, field: string) {
  return z
    .string()
    .trim()
    .min(1, `${field} não pode ficar em branco`)
    .max(max, `${field} passa de ${max} caracteres`)
    .refine((value) => !containsLink(value), {
      message: "RN16: links não são aceitos",
    });
}

/**
 * @ que o Hub não pode entregar a ninguém.
 *
 * O perfil de uma pessoa mora na raiz: `hub.app/lia`. O Next casa rota
 * estática antes de dinâmica, então `/inicio` continua sendo o Início — mas
 * quem registrasse `@inicio` ficaria **inalcançável para sempre**, sem
 * nenhum aviso.
 *
 * `design/rotas.test.ts` varre as rotas de primeiro nível e falha se alguma
 * não estiver aqui: criar rota nova sem reservar o nome quebra a suíte, em
 * vez de quebrar um perfil meses depois.
 *
 * Também ficam de fora alguns nomes que o Hub pode querer usar e os que
 * confundiriam quem lê a URL.
 */
export const HANDLES_RESERVADOS = new Set([
  // rotas que existem hoje
  "auth",
  "boas-vindas",
  "busca",
  "c",
  "cabines",
  "completar-cadastro",
  "comunidades",
  "configuracoes",
  "criar-conta",
  "criar-topico",
  "denuncia",
  "design",
  "entrar",
  "inicio",
  "notificacoes",
  "onboarding",
  "perfil",
  "senha",
  "termos",
  "topico",
  "u",
  // guardados para o Hub
  "admin",
  "ajuda",
  "api",
  "hub",
  "moderacao",
  "oficial",
  "privacidade",
  "sobre",
  "suporte",
]);

/** RN17: o @ é único na plataforma. Formato conservador, conforme CLAUDE.md. */
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{2,20}$/, "O @ aceita de 2 a 20 letras minúsculas, números e _")
  .refine((handle) => !HANDLES_RESERVADOS.has(handle), {
    message: "Esse @ é reservado pelo Hub. Escolha outro.",
  });

export const uuidSchema = z.uuid();

/** RN08/RN13/RN25: GIF ou 1 imagem — nunca os dois, nunca mais de uma. */
export const mediaSchema = z
  .object({
    url: z.url(),
    kind: z.enum(["image", "gif"]),
  })
  .nullable()
  .default(null);

/** RN08: nome e descrição de até 240 caracteres. */
export const createTopicSchema = z.object({
  communityId: uuidSchema,
  name: userText(80, "O nome do tópico"),
  description: userText(240, "A abertura do tópico"),
  media: mediaSchema,
});

/** RN13: resposta de até 240 caracteres. */
export const createAnswerSchema = z.object({
  topicId: uuidSchema,
  text: userText(240, "A resposta"),
  media: mediaSchema,
});

/** RN03: toda comunidade exige nome, intro, capa e Universo. */
export const createCommunitySchema = z.object({
  universeId: uuidSchema,
  name: userText(60, "O nome da comunidade"),
  intro: userText(240, "A intro"),
  coverUrl: z.url().nullable().default(null),
});

/** RN27: descrição de perfil de até 120 caracteres, sem links. */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  bio: userText(120, "A descrição").nullable().optional(),
  avatarUrl: z.url().nullable().optional(),
});

/** RN22: o convite pode levar uma mensagem de até 240 caracteres, sem links. */
export const inviteToCabinSchema = z.object({
  inviteeId: uuidSchema,
  cabinId: uuidSchema.optional(),
  message: userText(240, "A mensagem do convite").nullable().default(null),
});
