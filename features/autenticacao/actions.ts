"use server";

/**
 * Server Actions da entrada (F03).
 *
 * Regra de segurança 5: cada uma confere a sessão e a permissão no início, e
 * as que podem ser marteladas têm limitação de taxa.
 *
 * Duas decisões valem para o arquivo inteiro:
 *
 * 1. **A validação está aqui, não na tela.** A tela ajuda a pessoa; isto é a
 *    regra. Desmarcar a caixa de aceite no navegador não cria conta.
 * 2. **As mensagens não dizem se o email existe.** Email desconhecido e senha
 *    errada respondem igual, e pedir código responde igual nos dois casos.
 *    Senão o formulário vira ferramenta de descobrir quem tem conta no Hub.
 */
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createProfile, getProfileByAuthId, suggestAvailableHandle } from "@/lib/data/profiles";
import {
  clearAttempts,
  isRateLimited,
  recordAttempt,
  type AuthAction,
} from "@/lib/data/auth-attempts";
import { resolveAgeVerifier } from "@/lib/auth/age-verifier";
import { safeDestination } from "@/lib/auth/redirect";
import { handleSchema } from "@/lib/data/validation";
import { TERMS_VERSION, fieldErrorsFrom, type ActionState } from "./shared";

/** Mesma resposta para credencial errada e email inexistente. */
const CREDENCIAL_INVALIDA = "Email ou senha incorretos";
const MUITAS_TENTATIVAS = "Muitas tentativas. Espere alguns minutos e tente de novo.";

async function clientKey(): Promise<string> {
  const requestHeaders = await headers();
  // Atrás de proxy, o IP real vem no x-forwarded-for.
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    requestHeaders.get("x-real-ip") ??
    "desconhecido"
  );
}

/**
 * Limita por email **e** por rede, com tetos diferentes: só o email é fácil de
 * trocar, e só o IP junta gente que não tem nada a ver uma com a outra.
 */
async function guardRate(action: AuthAction, email: string): Promise<string | null> {
  const ip = await clientKey();
  const [porEmail, porRede] = await Promise.all([
    isRateLimited(action, email, "email"),
    isRateLimited(action, ip, "ip"),
  ]);
  return porEmail || porRede ? MUITAS_TENTATIVAS : null;
}

async function noteFailure(action: AuthAction, email: string) {
  await Promise.all([
    recordAttempt(action, email, false, "email"),
    recordAttempt(action, await clientKey(), false, "ip"),
  ]);
}

// ------------------------------------------------------------------ entrar

const entrarSchema = z.object({
  email: z.email("Informe um email válido"),
  password: z.string().min(1, "Informe a senha"),
  next: z.string().optional(),
});

export async function entrar(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = entrarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: CREDENCIAL_INVALIDA };

  const { email, password, next } = parsed.data;

  const limited = await guardRate("login", email);
  if (limited) return { error: limited };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    await noteFailure("login", email);
    // Mesma razão do cadastro: a pessoa vê uma resposta só, o operador vê o
    // motivo. Sem email nem senha no registro.
    console.error("[entrar] recusado pelo Supabase Auth", {
      code: error.code,
      status: error.status,
    });
    return { error: CREDENCIAL_INVALIDA };
  }

  await clearAttempts("login", email);
  redirect(safeDestination(next));
}

// -------------------------------------------------------------- criar conta

const criarContaSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(80),
  email: z.email("Informe um email válido"),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres"),
  birthDate: z.string().min(1, "Informe sua data de nascimento"),
  // A caixa só chega no FormData quando marcada. Exigir "on" é o que torna o
  // aceite obrigatório **no servidor**, não só na tela (RN29).
  acceptedTerms: z.literal("on", { message: "É preciso aceitar os Termos para criar conta" }),
});

export async function criarConta(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = criarContaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { name, email, password, birthDate } = parsed.data;

  const limited = await guardRate("signup", email);
  if (limited) return { error: limited };

  // RN29: verificação de idade antes de criar qualquer coisa. Em produção, sem
  // provedor configurado, o verificador nega — negar é o lado seguro.
  const verification = await resolveAgeVerifier().verify({
    reference: crypto.randomUUID(),
    declaredBirthDate: birthDate,
  });

  if (verification.status === "pending") redirect(verification.continueUrl);
  if (verification.status !== "verified") {
    await noteFailure("signup", email);
    return { fieldErrors: { birthDate: verification.reason } };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error || !data.user) {
    await noteFailure("signup", email);

    /*
     * A mensagem para a pessoa é vaga de propósito: dizer "este email já tem
     * conta" transformaria o formulário em ferramenta de descobrir cadastros.
     *
     * Mas vaga para quem opera o sistema é cegueira: sem isto, um cadastro
     * que para de funcionar em produção não deixa rastro nenhum. Então o
     * motivo vai para o registro do servidor — com código e mensagem do
     * Supabase, sem o email nem qualquer dado da pessoa (regra de segurança 10).
     */
    console.error("[cadastro] recusado pelo Supabase Auth", {
      code: error?.code,
      status: error?.status,
      message: error?.message,
    });

    return { error: "Não foi possível criar a conta. Confira os dados e tente de novo." };
  }

  await createProfile({
    authUserId: data.user.id,
    name,
    birthDate: new Date(birthDate),
    ageVerifiedAt: verification.verifiedAt,
    ageVerificationMethod: verification.method,
    termsVersion: TERMS_VERSION,
  });

  await clearAttempts("signup", email);
  redirect("/boas-vindas");
}

// ------------------------------------------------- completar cadastro (Google)

const completarSchema = z.object({
  name: z.string().trim().min(1, "Informe seu nome").max(80),
  handle: handleSchema,
  birthDate: z.string().min(1, "Informe sua data de nascimento"),
  acceptedTerms: z.literal("on", { message: "É preciso aceitar os Termos para criar conta" }),
  avatarUrl: z.string().optional(),
});

/**
 * RN29: o Google **não** substitui a verificação de idade nem o aceite. Quem
 * chega por lá passa por esta etapa igual a quem veio por email.
 */
export async function completarCadastro(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // O id vem da sessão, nunca do formulário: senão qualquer pessoa criaria
  // perfil no id de outra.
  if (!user) return { error: "Sua sessão expirou. Entre de novo." };
  if (await getProfileByAuthId(user.id)) redirect("/inicio");

  const parsed = completarSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const verification = await resolveAgeVerifier().verify({
    reference: user.id,
    declaredBirthDate: parsed.data.birthDate,
  });

  if (verification.status === "pending") redirect(verification.continueUrl);
  if (verification.status !== "verified") {
    return { fieldErrors: { birthDate: verification.reason } };
  }

  await createProfile({
    authUserId: user.id,
    name: parsed.data.name,
    handle: parsed.data.handle,
    avatarUrl: parsed.data.avatarUrl || null,
    birthDate: new Date(parsed.data.birthDate),
    ageVerifiedAt: verification.verifiedAt,
    ageVerificationMethod: verification.method,
    termsVersion: TERMS_VERSION,
  });

  redirect("/boas-vindas");
}

// ------------------------------------------------------- recuperar a senha

const pedirCodigoSchema = z.object({ email: z.email("Informe um email válido") });

/**
 * Responde igual exista ou não a conta. Quem tem recebe o código; quem não tem
 * vê a mesma tela — e ninguém usa este formulário para descobrir cadastros.
 */
export async function pedirCodigo(_state: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = pedirCodigoSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { fieldErrors: { email: "Informe um email válido" } };

  const { email } = parsed.data;

  const limited = await guardRate("password_reset", email);
  if (limited) return { error: limited };

  await recordAttempt("password_reset", email, false, "email");

  const supabase = await createClient();
  // O erro é ignorado de propósito: a resposta tem de ser a mesma nos dois casos.
  await supabase.auth.resetPasswordForEmail(email);

  redirect(`/senha/codigo?email=${encodeURIComponent(email)}`);
}

const novaSenhaSchema = z.object({
  email: z.email(),
  code: z.string().regex(/^\d{6}$/, "O código tem 6 dígitos"),
  password: z.string().min(8, "A senha precisa de ao menos 8 caracteres"),
});

export async function definirNovaSenha(
  _state: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = novaSenhaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { fieldErrors: fieldErrorsFrom(parsed.error.issues) };
  }

  const { email, code, password } = parsed.data;

  const limited = await guardRate("password_reset", email);
  if (limited) return { error: limited };

  const supabase = await createClient();

  // O código do email é um OTP de recuperação: trocá-lo por sessão é o que
  // prova que a pessoa tem acesso à caixa de entrada.
  const { error: otpError } = await supabase.auth.verifyOtp({
    email,
    token: code,
    type: "recovery",
  });

  if (otpError) {
    await noteFailure("password_reset", email);
    return { fieldErrors: { code: "Código inválido ou expirado" } };
  }

  const { error: updateError } = await supabase.auth.updateUser({ password });
  if (updateError) return { fieldErrors: { password: updateError.message } };

  await clearAttempts("password_reset", email);
  redirect("/inicio");
}

// ------------------------------------------------------------------- sair

export async function sair() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

/** Usada pela tela de completar cadastro para pré-preencher o @. */
export async function sugerirHandle(name: string) {
  return suggestAvailableHandle(name);
}
