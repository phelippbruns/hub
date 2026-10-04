import { redirect } from "next/navigation";

/**
 * A F03 usava /onboarding como destino do cadastro. O onboarding de verdade
 * mora em /boas-vindas, junto das outras telas de entrada. Este atalho existe
 * para nenhum link antigo morrer.
 */
export default function OnboardingPage() {
  redirect("/boas-vindas");
}
