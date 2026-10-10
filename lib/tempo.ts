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
