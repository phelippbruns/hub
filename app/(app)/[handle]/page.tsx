import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Perfil de outra pessoa · Hub" };

export default function Page() {
  return <EmBreve titulo="Perfil de outra pessoa" feature="F12" />;
}
