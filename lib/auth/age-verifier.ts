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

/**
 * Idade mínima do Hub.
 *
 * A RN29 e o escopo falam em 16 anos; o PO definiu **18**. Mantido 18 por ser
 * a decisão mais recente e a mais restritiva — errar para o lado de barrar
 * alguém de 17 é menos grave do que aceitar quem a regra queria barrar.
 *
 * Vale alinhar docs/escopo.md com esta decisão.
 */
export const MINIMUM_AGE = 18;

export type AgeVerificationRequest = {
  /** Identifica a tentativa nos registros do provedor. Nunca o email. */
  readonly reference: string;
  /**
   * Data informada pela pessoa. Serve de pista para o provedor, **nunca** como
   * prova: aceitar só isto seria autodeclaração, que a RN29 proíbe.
   */
  readonly declaredBirthDate?: string;
};

/**
 * Como a idade foi verificada. Espelha o tipo `age_verification_method` do
 * banco: o resultado da verificação é gravado no perfil, e quando o provedor
 * real entrar dá para encontrar quem passou só pela data declarada.
 */
export type AgeVerificationMethod = "self_declared" | "document" | "facial" | "external_provider";

export type AgeVerificationResult =
  | {
      readonly status: "verified";
      readonly verifiedAt: Date;
      readonly method: AgeVerificationMethod;
    }
  | { readonly status: "rejected"; readonly reason: string }
  /** O provedor precisa de uma etapa externa (redirecionar, enviar documento). */
  | { readonly status: "pending"; readonly continueUrl: string };

export interface AgeVerifier {
  readonly name: string;
  verify(input: AgeVerificationRequest): Promise<AgeVerificationResult>;
}

/**
 * Aprova quem **declara** ter a idade mínima ou mais.
 *
 * A RN29 exige verificação *sem* autodeclaração, e isto é exatamente
 * autodeclaração — o nome diz isso de propósito, para ninguém ligar achando
 * que é outra coisa.
 *
 * Está em uso por decisão registrada do PO, para permitir cadastros de teste
 * enquanto o provedor real não é escolhido. **Precisa sair antes do
 * lançamento**: é um dos bloqueadores que docs/escopo.md lista.
 */
export class SelfDeclaredAgeVerifier implements AgeVerifier {
  readonly name = "self_declared";
  readonly method: AgeVerificationMethod = "self_declared";

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

    return { status: "verified", verifiedAt: new Date(), method: this.method };
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
 * O padrão continua sendo **negar**: sem `AGE_VERIFIER` escrito à mão, devolve
 * o que nunca aprova. Esquecer de configurar não pode virar cadastro sem
 * verificação nenhuma.
 *
 * `self_declared` é a opção que o PO ligou para permitir cadastros de teste.
 * Ela não cumpre a RN29, e `lib/env.ts` avisa alto quando está ativa fora do
 * ambiente local — o aviso aparece no registro do deploy, para o estado não
 * virar esquecimento.
 */
export function resolveAgeVerifier(
  choice: string | undefined = process.env.AGE_VERIFIER,
): AgeVerifier {
  return choice === "self_declared" ? new SelfDeclaredAgeVerifier() : new UnavailableAgeVerifier();
}
