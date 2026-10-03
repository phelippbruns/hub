/**
 * Validação das variáveis de ambiente (regra de segurança 3).
 *
 * Segredo nunca leva o prefixo NEXT_PUBLIC_: o Next inlina qualquer variável
 * com esse prefixo no bundle enviado ao navegador. Por isso há dois schemas
 * separados, e o schema de servidor lança se for importado do lado do cliente.
 *
 * `next.config.ts` importa este módulo, então a validação roda durante o build:
 * faltando variável obrigatória, o build falha antes de gerar qualquer página.
 */
import { z } from "zod";

const serverSchema = z.object({
  // Conexão usada pelo Prisma em runtime. No Supabase é o pooler (porta 6543).
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Conexão direta (porta 5432), usada por migrations e introspecção.
  DIRECT_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  // Ignora RLS. Só no servidor, nunca em código enviado ao navegador.
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const clientSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
});

export type ServerEnv = z.infer<typeof serverSchema>;
export type ClientEnv = z.infer<typeof clientSchema>;

/** Monta uma mensagem que nomeia cada variável com problema, sem imprimir valores. */
function format(error: z.ZodError, scope: string): string {
  const lines = error.issues.map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`);
  return `Variáveis de ambiente inválidas (${scope}):\n${lines.join("\n")}`;
}

/** Exportado para teste: valida sem depender do process.env real. */
export function parseServerEnv(source: Record<string, string | undefined>): ServerEnv {
  const result = serverSchema.safeParse(source);
  if (!result.success) throw new Error(format(result.error, "servidor"));
  return result.data;
}

/** Exportado para teste: valida sem depender do process.env real. */
export function parseClientEnv(source: Record<string, string | undefined>): ClientEnv {
  const result = clientSchema.safeParse(source);
  if (!result.success) throw new Error(format(result.error, "navegador"));
  return result.data;
}

let serverCache: ServerEnv | undefined;
let clientCache: ClientEnv | undefined;

/**
 * Variáveis de servidor, validadas na primeira leitura e memorizadas.
 *
 * Importar isto de um Client Component é erro de programação, e o guard abaixo
 * transforma esse erro em falha imediata em vez de `undefined` silencioso.
 */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error("lib/env: serverEnv() não pode ser lido no navegador.");
  }
  serverCache ??= parseServerEnv(process.env);
  return serverCache;
}

/**
 * Variáveis públicas. As chaves são escritas literalmente porque o Next só
 * substitui ocorrências estáticas de `process.env.NEXT_PUBLIC_*`.
 */
export function clientEnv(): ClientEnv {
  clientCache ??= parseClientEnv({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  });
  return clientCache;
}

/**
 * Chamada por next.config.ts: faz a validação rodar durante o build, de modo
 * que faltando variável obrigatória o build falhe antes de gerar qualquer
 * página, em vez de quebrar na primeira requisição em produção.
 */
export function assertEnv(): void {
  serverEnv();
  clientEnv();
}
