import type { Metadata } from "next";
import { EmBreve } from "../../em-breve";

export const metadata: Metadata = { title: "Minhas comunidades · Hub" };

export default function Page() {
  return <EmBreve titulo="Minhas comunidades" feature="F07" />;
}
