/**
 * Validação de entrada da camada de dados (regra de segurança 4).
 *
 * Toda entrada é validada aqui, no servidor, mesmo que a tela já valide. A tela
 * é conveniência; isto é a regra.
 */
import { z } from "zod";
import { ZOOM_MAXIMO, ZOOM_MINIMO } from "@/lib/midia/enquadramento";
import { acharLink, contemLink } from "@/lib/texto/links";

/**
 * RN16: compatibilidade com quem já importava este nome.
 *
 * A detecção mora em [links.ts](./links.ts), com os casos testados nas duas
 * direções.
 */
export const containsLink = contemLink;

export { acharLink, contemLink };

/** Texto de usuário: sem links, sem espaço sobrando, com limite de tamanho. */
export function userText(max: number, field: string) {
  return z
    .string()
    .trim()
    .min(1, `${field} não pode ficar em branco`)
    .max(max, `${field} passa de ${max} caracteres`)
    .refine((value) => !contemLink(value), {
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

/**
 * RN08/RN13/RN25: GIF ou 1 imagem — nunca os dois, nunca mais de uma.
 *
 * Para imagem, `caminho` é a posição no depósito (`respostas/<id>.jpg`), não
 * um endereço: o depósito é privado e o endereço é assinado na hora de
 * exibir. Para GIF, é a URL do GIPHY, que é pública por natureza.
 */
export const mediaSchema = z
  .object({
    caminho: z.string().min(1).max(500),
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

/**
 * RN13: resposta de até 240 caracteres.
 *
 * O texto pode vir vazio **desde que haja mídia**: decisão do PO — responder
 * só com um GIF ou só com uma imagem é uma resposta. Vazia dos dois lados
 * continua recusada, aqui e por CHECK no banco.
 */
export const createAnswerSchema = z
  .object({
    topicId: uuidSchema,
    text: z
      .string()
      .trim()
      .max(240, "A resposta passa de 240 caracteres")
      .refine((value) => !contemLink(value), {
        message: "RN16: links não são aceitos",
      }),
    media: mediaSchema,
  })
  .refine((entrada) => entrada.text.length > 0 || entrada.media !== null, {
    message: "A resposta precisa de texto, de uma imagem ou de um GIF",
    path: ["text"],
  });

/**
 * RN03: toda comunidade exige nome, intro e capa.
 *
 * O Universo saiu da exigência na F12.1: toda comunidade cai no Hubverso, que
 * é um pai único e invisível. `universeId` continua aceito — quem já manda
 * um continua funcionando — mas não é mais pedido a ninguém.
 */
export const createCommunitySchema = z.object({
  universeId: uuidSchema.optional(),
  name: userText(60, "O nome da comunidade"),
  intro: userText(240, "A intro"),
  /**
   * Caminho no depósito (`capas/<uuid>.jpg`) **ou** endereço.
   *
   * Era só `z.url()`, e isso impedia a capa de ser enviada na criação: o
   * depósito devolve caminho, não URL, e o que a tela manda é o caminho. A
   * capa padrão do Universo é uma URL, e continua passando.
   */
  coverUrl: z.string().min(1).max(500).nullable().default(null),

  /*
   * O enquadramento da capa. Estes cinco **não vêm do formulário**: a
   * action os preenche com as medidas que leu dos bytes e com a âncora já
   * reconferida. Estão no schema para o tipo de `createCommunity` ser um
   * só, não para aceitar o que o navegador mandar.
   */
  coverWidth: z.int().positive().nullable().default(null),
  coverHeight: z.int().positive().nullable().default(null),
  coverZoom: z.number().min(ZOOM_MINIMO).max(ZOOM_MAXIMO).default(ZOOM_MINIMO),
  coverAnchorX: z.number().min(0).max(1).default(0.5),
  coverAnchorY: z.number().min(0).max(1).default(0.5),
});

/** RN27: até 3 links no perfil. */
export const MAXIMO_DE_LINKS = 3;

/**
 * O endereço de um link do perfil.
 *
 * **É o único campo do Hub que aceita link** (RN16). Por isso ele não passa
 * por `userText`, e por isso é o único lugar onde a conferência precisa ser
 * no sentido contrário: em vez de recusar o que parece endereço, recusa o
 * que não é um endereço seguro.
 *
 * Só `http` e `https`. O que importa não é o que a lista permite e sim o
 * que ela barra: `javascript:` num `href` executa código na página de quem
 * clica, e `data:` serve uma página falsa no nosso domínio.
 */
const enderecoDeLink = z
  .string()
  .trim()
  .min(1, "O endereço não pode ficar em branco")
  .max(300, "O endereço passa de 300 caracteres")
  // "phelipp.com" é o que as pessoas digitam; vira https antes de qualquer
  // conferência, senão `new URL` nem consegue lê-lo.
  .transform((valor) => (/^[a-z][a-z0-9+.-]*:/i.test(valor) ? valor : `https://${valor}`))
  .refine(
    (valor) => {
      try {
        const url = new URL(valor);
        return (
          (url.protocol === "http:" || url.protocol === "https:") && url.hostname.includes(".")
        );
      } catch {
        return false;
      }
    },
    { message: "Use um endereço que comece com https://" },
  );

/**
 * Um link do perfil: título curto e endereço.
 *
 * O título tem 12 caracteres porque ele fica numa fileira com os outros
 * dois; e **não pode conter link**, senão o campo de texto viraria a porta
 * dos fundos da RN16 — alguém escreveria o endereço no título, onde ele
 * aparece como texto solto.
 */
export const profileLinkSchema = z.object({
  title: userText(12, "O título do link"),
  url: enderecoDeLink,
});

/**
 * RN27: a cor de fundo do perfil é guardada como chave, nunca como hex.
 *
 * A lista vive no design system; aqui só se confere que a chave existe.
 * Chave desconhecida **não é erro**: cai no padrão. Um perfil não pode
 * deixar de abrir porque a paleta mudou embaixo dele.
 */
export const backgroundKeySchema = z.string().trim().max(20).catch("lavanda").default("lavanda");

/** RN30: zoom de 1 a 3 e deslocamento em fração do quadro. */
export const enquadramentoSchema = z.object({
  zoom: z.coerce.number().catch(1).default(1),
  ox: z.coerce.number().catch(0).default(0),
  oy: z.coerce.number().catch(0).default(0),
});

/** RN27: descrição de perfil de até 120 caracteres, sem links. */
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(80),
  /** RN17: o @ é único, e dá para trocar na tela de editar perfil. */
  handle: handleSchema.optional(),
  bio: userText(120, "A descrição").nullable().optional(),
  /**
   * Caminho no depósito, não um endereço: o depósito é privado e o endereço
   * é assinado na hora de exibir, como na imagem da resposta.
   *
   * **Ausente quer dizer "não mexer"**, e não "apagar": a foto é enviada por
   * um caminho diferente do nome e da descrição, e salvar o formulário sem
   * trocar a foto não pode apagá-la.
   */
  avatarCaminho: z.string().min(1).max(500).nullable().optional(),
  /**
   * RN27: a lista inteira, sempre — não um link de cada vez.
   *
   * Mandar a lista completa é o que deixa apagar e reordenar funcionarem
   * sem nenhuma operação a mais: o servidor substitui o que havia. Ausente
   * quer dizer "não mexer", como no caminho da foto.
   */
  links: z
    .array(profileLinkSchema)
    .max(MAXIMO_DE_LINKS, `São no máximo ${MAXIMO_DE_LINKS} links`)
    .optional(),
  backgroundKey: backgroundKeySchema.optional(),
  hideFollowers: z.boolean().optional(),
  enquadramento: enquadramentoSchema.optional(),
});

/** RN22: o convite pode levar uma mensagem de até 240 caracteres, sem links. */
export const inviteToCabinSchema = z.object({
  inviteeId: uuidSchema,
  cabinId: uuidSchema.optional(),
  message: userText(240, "A mensagem do convite").nullable().default(null),
});
