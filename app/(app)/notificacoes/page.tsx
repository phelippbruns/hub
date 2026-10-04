import type { Metadata } from "next";
import { EmBreve } from "../em-breve";

export const metadata: Metadata = { title: "Notificações · Hub" };

export default function Page() {
  return <EmBreve titulo="Notificações" feature="F15" />;
}
