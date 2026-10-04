import type { Metadata } from "next";
import { EmBreve } from "../../em-breve";

export const metadata: Metadata = { title: "Pessoas que você segue · Hub" };

export default function Page() {
  return <EmBreve titulo="Pessoas que você segue" feature="F12" />;
}
