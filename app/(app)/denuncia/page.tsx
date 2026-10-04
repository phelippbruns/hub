import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Denúncia e bloqueio · Hub" };

export default function Page() {
  return <EmBreve titulo="Denúncia e bloqueio" feature="F16" />;
}
