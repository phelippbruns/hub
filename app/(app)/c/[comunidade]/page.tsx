import type { Metadata } from "next";
import { EmBreve } from "../../em-breve";

export const metadata: Metadata = { title: "Página da comunidade · Hub" };

export default function Page() {
  return <EmBreve titulo="Página da comunidade" feature="F07" />;
}
