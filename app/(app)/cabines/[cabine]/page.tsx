import type { Metadata } from "next";
import { EmBreve } from "../../em-breve";

export const metadata: Metadata = { title: "Cabine · Hub" };

export default function Page() {
  return <EmBreve titulo="Cabine" feature="F13" />;
}
