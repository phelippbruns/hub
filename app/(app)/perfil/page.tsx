import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Perfil · Hub" };

export default function Page() {
  return <EmBreve titulo="Perfil" feature="F12" />;
}
