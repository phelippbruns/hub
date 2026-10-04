import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Criar tópico · Hub" };

export default function Page() {
  return <EmBreve titulo="Criar tópico" feature="F08" />;
}
