import type { Metadata } from "next";
import { EmBreve } from "../../../em-breve";

export const metadata: Metadata = { title: "Moderação da comunidade · Hub" };

export default function Page() {
  return <EmBreve titulo="Moderação da comunidade" feature="F16" />;
}
