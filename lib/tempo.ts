/**
 * "há 5 min", como o protótipo escreve.
 *
 * Em português e sem biblioteca: são seis faixas, e `Intl.RelativeTimeFormat`
 * sozinho não escolhe a faixa — a escolha é o trabalho todo.
 */
export function haQuantoTempo(quando: Date, agora: Date = new Date()): string {
  const segundos = Math.max(0, Math.floor((agora.getTime() - quando.getTime()) / 1000));

  if (segundos < 60) return "agora";

  const minutos = Math.floor(segundos / 60);
  if (minutos < 60) return `há ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `há ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 7) return `há ${dias} ${dias === 1 ? "dia" : "dias"}`;

  const semanas = Math.floor(dias / 7);
  if (dias < 30) return `há ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;

  const meses = Math.floor(dias / 30);
  if (meses < 12) return `há ${meses} ${meses === 1 ? "mês" : "meses"}`;

  const anos = Math.floor(dias / 365);
  return `há ${anos} ${anos === 1 ? "ano" : "anos"}`;
}

/**
 * O fuso do ciclo, o mesmo que o banco usa em `hub_cycle_timezone()`.
 *
 * **Está escrito em dois lugares de propósito**, e isso é uma dívida
 * conhecida: o banco precisa dele dentro de funções `IMMUTABLE`, e a tela
 * precisa dele sem ir ao banco a cada renderização. O que impede os dois de
 * divergirem é um teste — `lib/tempo.db.test.ts` pergunta o fuso ao banco e
 * reprova se não for este.
 *
 * Sem esse teste, mudar o fuso num lugar faria a semana virar numa hora e o
 * Hot Topic noutra, sem ninguém notar.
 */
export const FUSO_DO_CICLO = "America/Sao_Paulo";

/** Quanto o relógio do fuso está à frente do UTC, em minutos, neste instante. */
function deslocamento(quando: Date, fuso: string): number {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(quando);

  const campo = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? "0");
  const comoSeFosseUtc = Date.UTC(
    campo("year"),
    campo("month") - 1,
    campo("day"),
    // Meia-noite no fuso volta como "24" em algumas plataformas.
    campo("hour") % 24,
    campo("minute"),
    campo("second"),
  );

  // Os milissegundos do instante não entram na conta: o fuso não os desloca.
  return (comoSeFosseUtc - Math.floor(quando.getTime() / 1000) * 1000) / 60_000;
}

/** O dia do calendário, no fuso, como ano/mês/dia. */
function diaNoFuso(quando: Date, fuso: string) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fuso,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(quando);
  const campo = (tipo: string) => Number(partes.find((p) => p.type === tipo)?.value ?? "0");
  return { ano: campo("year"), mes: campo("month"), dia: campo("day") };
}

/** O instante da meia-noite de um dia do calendário, no fuso. */
function meiaNoiteNoFuso(ano: number, mes: number, dia: number, fuso: string): Date {
  const chute = Date.UTC(ano, mes - 1, dia);
  const primeiro = new Date(chute - deslocamento(new Date(chute), fuso) * 60_000);

  /*
   * Uma correção, para o caso de o fuso ter mudado de deslocamento entre o
   * chute e o resultado — é o que acontece na virada do horário de verão.
   * O Brasil não tem mais, mas a função não é só do Brasil, e um erro de
   * uma hora numa semana que começa no domingo às 00h move o corte para
   * sábado.
   */
  const corrigido = new Date(chute - deslocamento(primeiro, fuso) * 60_000);
  return corrigido;
}

/**
 * O domingo mais recente, às 00h **no fuso do ciclo**.
 *
 * É o corte de "Essa semana" na central de notificações: a área mostra o
 * que chegou de lá para cá, e zera sozinha quando o domingo vira. Nada é
 * apagado — a janela é da tela, não do banco.
 *
 * No fuso do ciclo, e não no do servidor, pelo mesmo motivo de sempre: o
 * servidor roda em UTC, e a semana viraria às 21h de sábado para quem está
 * no Brasil.
 */
export function domingoMaisRecente(agora: Date = new Date(), fuso = FUSO_DO_CICLO): Date {
  const hoje = diaNoFuso(agora, fuso);

  // `getUTCDay` sobre a data do calendário dá o dia da semana dela, sem o
  // fuso entrar de novo na conta: 0 é domingo.
  const diaDaSemana = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia)).getUTCDay();

  const domingo = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia - diaDaSemana));
  return meiaNoiteNoFuso(
    domingo.getUTCFullYear(),
    domingo.getUTCMonth() + 1,
    domingo.getUTCDate(),
    fuso,
  );
}
