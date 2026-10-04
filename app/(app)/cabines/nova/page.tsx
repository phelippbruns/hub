import type { Metadata } from "next";
import { EmBreve } from "../../em-breve";

export const metadata: Metadata = { title: "Nova Cabine · Hub" };

export default function Page() {
  return <EmBreve titulo="Nova Cabine" feature="F13" />;
}
