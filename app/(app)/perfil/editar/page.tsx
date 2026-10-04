import type { Metadata } from "next";
import { EmBreve } from "../../em-breve";

export const metadata: Metadata = { title: "Editar perfil · Hub" };

export default function Page() {
  return <EmBreve titulo="Editar perfil" feature="F12" />;
}
