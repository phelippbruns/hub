import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Resultado da busca · Hub" };

export default function Page() {
  return <EmBreve titulo="Resultado da busca" feature="F06" />;
}
