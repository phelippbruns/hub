import { prisma } from "./prisma";
import { requireProfileId, type Viewer } from "./viewer";
import { translateDatabaseError } from "./errors";
import { definirStatusSchema } from "./validation";
import type { TipoDeStatus } from "@/lib/status";

/**
 * RN40: o status do perfil — o que a pessoa está fazendo agora.
 *
 * **Uma linha por status, e o de agora é o de `endedAt` nulo.** Trocar não
 * sobrescreve: encerra o anterior e abre outro. É o que faz o histórico
 * existir sem tabela separada, e é o que deixa o banco garantir "um por
 * pessoa" com um índice único parcial em vez de código.
 *
 * **O status é público** (decisão do PO), e por isso não há conferência de
 * quem pode ler. O que há é conferência de quem pode **escrever**, e essa é
 * a única que importa aqui: o id vem da sessão, nunca do formulário.
 */

export type StatusNaTela = {
  tipo: TipoDeStatus;
  texto: string;
  desde: Date;
};

export type StatusEncerrado = StatusNaTela & { ate: Date };

/** O status de agora, ou `null` se a pessoa não tem nenhum. */
export async function statusDoPerfil(profileId: string): Promise<StatusNaTela | null> {
  const linha = await prisma.profileStatus.findFirst({
    where: { profileId, endedAt: null },
    select: { kind: true, text: true, createdAt: true },
  });

  return linha ? { tipo: linha.kind, texto: linha.text, desde: linha.createdAt } : null;
}

/**
 * Os status anteriores, do mais recente para o mais antigo.
 *
 * Não leva `LIMIT`: quem poda é o gatilho `profile_statuses_podar`, e já
 * não existem mais do que 8. Filtrar aqui também daria o número certo e
 * **esconderia** o dia em que a poda parasse de funcionar.
 */
export async function historicoDeStatus(profileId: string): Promise<StatusEncerrado[]> {
  const linhas = await prisma.profileStatus.findMany({
    where: { profileId, endedAt: { not: null } },
    orderBy: { endedAt: "desc" },
    select: { kind: true, text: true, createdAt: true, endedAt: true },
  });

  return linhas.map((linha) => ({
    tipo: linha.kind,
    texto: linha.text,
    desde: linha.createdAt,
    ate: linha.endedAt!,
  }));
}

/**
 * Define o status de agora, mandando o anterior para o histórico.
 *
 * As duas escritas vão na **mesma transação**: encerrar e abrir são um ato
 * só. Separadas, uma falha no meio deixaria a pessoa sem status nenhum —
 * e o índice parcial, que é quem garante a RN40, barraria a abertura se o
 * encerramento não tivesse acontecido.
 */
export async function definirStatus(viewer: Viewer, input: unknown): Promise<StatusNaTela> {
  const me = requireProfileId(viewer);
  const dados = definirStatusSchema.parse(input);

  try {
    return await prisma.$transaction(async (tx) => {
      await tx.profileStatus.updateMany({
        where: { profileId: me, endedAt: null },
        data: { endedAt: new Date() },
      });

      const novo = await tx.profileStatus.create({
        data: { profileId: me, kind: dados.tipo, text: dados.texto },
        select: { kind: true, text: true, createdAt: true },
      });

      return { tipo: novo.kind, texto: novo.text, desde: novo.createdAt };
    });
  } catch (error) {
    translateDatabaseError(error);
  }
}

/**
 * Tira o status, mandando o atual para o histórico.
 *
 * Encerra em vez de apagar: o que a pessoa escreveu continua sendo parte do
 * histórico dela. "Limpar" é sobre a pílula sumir do perfil, não sobre
 * desfazer o passado.
 */
export async function limparStatus(viewer: Viewer): Promise<void> {
  const me = requireProfileId(viewer);

  await prisma.profileStatus.updateMany({
    where: { profileId: me, endedAt: null },
    data: { endedAt: new Date() },
  });
}
