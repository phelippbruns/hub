/**
 * Verificação de idade (RN29).
 *
 * "A idade mínima é de 16 anos, com verificação **sem autodeclaração**. Login
 * com Google não substitui a verificação."
 *
 * Por isso isto é uma interface, e não uma função: o método de verificação
 * depende de revisão jurídica e ainda é um ponto em aberto no escopo. Quando o
 * provedor for escolhido, entra aqui uma implementação nova e nada mais muda.
 *
 * TODO(jurídico): escolher o provedor real de verificação de idade.
 * Pendências registradas em docs/escopo.md (Pontos em aberto):
 *   - método de verificação, a definir com revisão jurídica;
 *   - idade mínima de 16 ou 17 anos (o ECA Digital fala em contas "de até 16").
 * Enquanto não houver provedor, produção **recusa o cadastro** — ver
 * `resolveAgeVerifier`.
 */

/** Idade mínima do Hub (RN29). Um lugar só, para a revisão jurídica mexer. */
export const MINIMUM_AGE = 16;

export type AgeVerificationRequest = {
  /** Identifica a tentativa nos registros do provedor. Nunca o email. */
  readonly reference: string;
  /**
   * Data informada pela pessoa. Serve de pista para o provedor, **nunca** como
   * prova: aceitar só isto seria autodeclaração, que a RN29 proíbe.
   */
  readonly declaredBirthDate?: string;
};

export type AgeVerificationResult =
  | { readonly status: "verified"; readonly verifiedAt: Date; readonly provider: string }
  | { readonly status: "rejected"; readonly reason: string }
  /** O provedor precisa de uma etapa externa (redirecionar, enviar documento). */
  | { readonly status: "pending"; readonly continueUrl: string };

export interface AgeVerifier {
  readonly name: string;
  verify(input: AgeVerificationRequest): Promise<AgeVerificationResult>;
}

/**
 * Verificador de desenvolvimento. Aprova quem declara 16 anos ou mais.
 *
 * **Não serve para produção**: ele confia na data declarada, que é exatamente
 * o que a RN29 proíbe. Existe para o fluxo poder ser construído e testado
 * antes da decisão jurídica, e `resolveAgeVerifier` impede que vaze.
 */
export class FakeAgeVerifier implements AgeVerifier {
  readonly name = "fake";

  async verify(input: AgeVerificationRequest): Promise<AgeVerificationResult> {
    if (!input.declaredBirthDate) {
      return { status: "rejected", reason: "Informe sua data de nascimento" };
    }

    const birth = new Date(input.declaredBirthDate);
    if (Number.isNaN(birth.getTime())) {
      return { status: "rejected", reason: "Data de nascimento inválida" };
    }

    if (ageOn(birth, new Date()) < MINIMUM_AGE) {
      return {
        status: "rejected",
        reason: `O Hub é para maiores de ${MINIMUM_AGE} anos`,
      };
    }

    return { status: "verified", verifiedAt: new Date(), provider: this.name };
  }
}

/** Verificador que nunca aprova. É o que produção usa enquanto não há provedor. */
export class UnavailableAgeVerifier implements AgeVerifier {
  readonly name = "unavailable";

  async verify(): Promise<AgeVerificationResult> {
    return {
      status: "rejected",
      reason: "A verificação de idade está indisponível. Tente mais tarde.",
    };
  }
}

export function ageOn(birth: Date, reference: Date): number {
  let age = reference.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = reference.getUTCMonth() - birth.getUTCMonth();
  if (monthDiff < 0 || (monthDiff === 0 && reference.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }
  return age;
}

/**
 * Escolhe o verificador.
 *
 * O padrão é **negar**: sem `AGE_VERIFIER=fake` explícito, devolve o
 * verificador que nunca aprova. Liberar cadastro sem verificação seria
 * descumprir a RN29 calado, e esquecer de configurar é o erro mais provável.
 *
 * O interruptor é uma variável própria, e não `NODE_ENV`, porque os testes de
 * jornada rodam contra um build de produção — amarrar ao NODE_ENV obrigaria a
 * escolher entre testar o fluxo e manter produção segura.
 *
 * Duas travas impedem que o falso escape:
 *   1. a variável precisa ser escrita à mão em `AGE_VERIFIER`;
 *   2. `lib/env.ts` derruba o build se ela vier junto com um Supabase que não
 *      é local — ou seja, num ambiente de verdade.
 */
export function resolveAgeVerifier(
  choice: string | undefined = process.env.AGE_VERIFIER,
): AgeVerifier {
  return choice === "fake" ? new FakeAgeVerifier() : new UnavailableAgeVerifier();
}
