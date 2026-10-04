/**
 * Limite de tentativas de autenticação (F03, item 10).
 *
 * Fica em lib/data/ porque fala com o Prisma. Não recebe `Viewer`: é chamada
 * antes de existir sessão, que é justamente o ponto.
 */
import { createHash } from "node:crypto";
import { prisma } from "./prisma";

export type AuthAction = "login" | "signup" | "password_reset";

/**
 * De quem é a tentativa. A distinção importa muito:
 *
 * - **email** identifica uma conta. Dez erros no mesmo email é ataque.
 * - **ip** identifica uma *rede*. Escritório, escola, universidade e operadora
 *   móvel colocam centenas de pessoas atrás do mesmo endereço. Um teto baixo
 *   por IP não barra atacante nenhum (ele troca de IP) e barra gente de
 *   verdade que só queria criar uma conta.
 *
 * Por isso o teto por IP é bem mais alto: ele existe para conter varredura
 * automatizada, não para policiar quem está na mesma rede.
 */
export type AttemptScope = "email" | "ip";

type Limit = { attempts: number; windowMinutes: number };

/** `Map` em vez de objeto aninhado: busca por chave dinâmica sem tocar em protótipo. */
const LIMITS = new Map<string, Limit>([
  ["email:login", { attempts: 10, windowMinutes: 15 }],
  ["email:signup", { attempts: 5, windowMinutes: 60 }],
  ["email:password_reset", { attempts: 5, windowMinutes: 60 }],
  ["ip:login", { attempts: 100, windowMinutes: 15 }],
  ["ip:signup", { attempts: 60, windowMinutes: 60 }],
  ["ip:password_reset", { attempts: 60, windowMinutes: 60 }],
]);

function limitFor(scope: AttemptScope, action: AuthAction): Limit {
  const limit = LIMITS.get(`${scope}:${action}`);
  if (!limit) throw new Error(`Sem limite definido para ${scope}:${action}`);
  return limit;
}

/**
 * O email nunca é gravado em claro: a tabela de tentativas não pode virar
 * lista de quem tem conta no Hub (regra de segurança 10).
 */
export function hashKey(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex");
}

export async function recordAttempt(
  action: AuthAction,
  key: string,
  succeeded: boolean,
  scope: AttemptScope = "email",
) {
  await prisma.authAttempt.create({
    data: { action: `${scope}:${action}`, keyHash: hashKey(key), succeeded },
  });
}

/**
 * Quantas tentativas sem sucesso restam. Zero significa bloqueado.
 *
 * Tentativa bem-sucedida não conta: quem acertou a senha não deve ser punido
 * por ter errado antes.
 */
export async function remainingAttempts(
  action: AuthAction,
  key: string,
  scope: AttemptScope = "email",
): Promise<number> {
  const limit = limitFor(scope, action);
  const since = new Date(Date.now() - limit.windowMinutes * 60 * 1000);

  const used = await prisma.authAttempt.count({
    where: {
      action: `${scope}:${action}`,
      keyHash: hashKey(key),
      succeeded: false,
      createdAt: { gte: since },
    },
  });

  return Math.max(limit.attempts - used, 0);
}

export async function isRateLimited(
  action: AuthAction,
  key: string,
  scope: AttemptScope = "email",
): Promise<boolean> {
  return (await remainingAttempts(action, key, scope)) === 0;
}

/** Limpa o histórico de quem entrou, para o acerto zerar o contador. */
export async function clearAttempts(
  action: AuthAction,
  key: string,
  scope: AttemptScope = "email",
) {
  await prisma.authAttempt.deleteMany({
    where: { action: `${scope}:${action}`, keyHash: hashKey(key) },
  });
}
