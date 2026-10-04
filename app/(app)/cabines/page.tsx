import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Cabines · Hub" };

export default function Page() {
  return <EmBreve titulo="Cabines" feature="F13" />;
}
