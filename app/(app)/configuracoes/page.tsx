import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Configurações · Hub" };

export default function Page() {
  return <EmBreve titulo="Configurações" feature="F17" />;
}
