import type { Metadata } from "next";
import { EmBreve } from "../../../em-breve";

export const metadata: Metadata = { title: "Tópico · Hub" };

export default function Page() {
  return <EmBreve titulo="Tópico" feature="F08" />;
}
