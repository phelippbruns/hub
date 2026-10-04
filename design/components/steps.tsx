import { cn } from "../cn";

/**
 * Barra de etapas do cadastro (tela 3).
 *
 * É informação de progresso, não decoração: por isso vai como `progressbar`
 * com os valores, em vez de três traços mudos.
 */
export function Steps({
  total,
  current,
  label = "Progresso do cadastro",
}: {
  total: number;
  current: number;
  label?: string;
}) {
  return (
    <div
      role="progressbar"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={current}
      aria-label={`${label}: etapa ${current} de ${total}`}
      className="flex gap-1"
    >
      {Array.from({ length: total }, (_, index) => (
        <span
          key={index}
          className={cn("rounded-pill h-1 flex-1", index < current ? "bg-ink" : "bg-line")}
        />
      ))}
    </div>
  );
}
