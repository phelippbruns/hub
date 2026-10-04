import type { Metadata } from "next";
import { EmBreve } from "../../em-breve";

export const metadata: Metadata = { title: "Página do Universo · Hub" };

export default function Page() {
  return <EmBreve titulo="Página do Universo" feature="F06" />;
}
