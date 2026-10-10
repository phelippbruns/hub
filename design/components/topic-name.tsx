import { TopicStarInline } from "../icons";
import { cn } from "../cn";

/**
 * O nome de um tópico, sempre com o asterisco desenhado.
 *
 * Existe para que o asterisco seja o mesmo em qualquer texto, como o design
 * system manda. Antes cada tela montava o par à mão, e o espaçamento entre a
 * marca e o nome já tinha saído diferente em três lugares.
 *
 * O asterisco é **decorativo**: ele diz "isto é um tópico" para quem vê, e
 * repeti-lo em voz alta a cada nome só atrapalharia quem ouve.
 */
export function TopicName({ children, className }: { children: string; className?: string }) {
  return (
    <span className={cn("inline", className)}>
      <TopicStarInline className="mr-1" />
      {children}
    </span>
  );
}
