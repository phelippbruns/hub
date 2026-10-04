import type { Metadata } from "next";
import { EmBreve } from "../../em-breve";

export const metadata: Metadata = { title: "Convite para Cabine · Hub" };

export default function Page() {
  return <EmBreve titulo="Convite para Cabine" feature="F13" />;
}
