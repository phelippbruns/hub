/**
 * Erros da camada de dados.
 *
 * A tela traduz estes em mensagem para a pessoa. Nenhum deles carrega detalhe
 * de banco: quem não pode ver uma coisa não deve nem descobrir que ela existe.
 */

export class NotFoundError extends Error {
  readonly code = "not_found";
  constructor(what: string) {
    super(`${what} não encontrado`);
    this.name = "NotFoundError";
  }
}

export class ForbiddenError extends Error {
  readonly code = "forbidden";
  constructor(message = "Você não tem permissão para isso") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends Error {
  readonly code = "unauthenticated";
  constructor() {
    super("Entre para continuar");
    this.name = "UnauthenticatedError";
  }
}

/** Violação de regra de negócio. `rule` é o código da RN, para o teste citar. */
export class RuleViolationError extends Error {
  readonly code = "rule_violation";
  constructor(
    readonly rule: string,
    message: string,
  ) {
    super(message);
    this.name = "RuleViolationError";
  }
}

/**
 * Traduz a violação que veio do banco em erro de regra.
 *
 * Os gatilhos e índices das migrations são a última barreira (duas requisições
 * simultâneas passam pela checagem do app e só o banco as separa). Quando eles
 * disparam, o erro chega como código do Postgres — aqui ele vira a RN certa.
 */
export function translateDatabaseError(error: unknown): never {
  const text = error instanceof Error ? error.message : String(error);

  if (text.includes("topics_one_per_author_per_day")) {
    throw new RuleViolationError("RN07", "Você já criou um tópico nesta comunidade hoje");
  }
  if (text.includes("communities_name_normalized_key") || text.includes("name_normalized")) {
    throw new RuleViolationError("RN04", "Já existe uma comunidade com esse nome");
  }
  for (const rule of ["RN04", "RN07", "RN08", "RN20", "RN21"] as const) {
    if (text.includes(`${rule}:`)) {
      throw new RuleViolationError(rule, text.slice(text.indexOf(`${rule}:`)));
    }
  }

  throw error;
}
