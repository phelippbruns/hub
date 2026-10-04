import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Explorar comunidades · Hub" };

export default function Page() {
  return <EmBreve titulo="Explorar comunidades" feature="F06" />;
}
