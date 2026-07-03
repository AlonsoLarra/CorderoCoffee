import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";

import { resendConfirmationAction, signInAction } from "@/app/(public)/acceso/actions";
import { COPY } from "@/lib/copy";
import { isEmailVerified } from "@/lib/supabase/email-verification";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type AccessPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
    redirectTo?: string;
  };
};

export default async function AccessPage({ searchParams }: AccessPageProps) {
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const redirectTo = searchParams?.redirectTo;

  // Keep the access page reachable from the public login CTA.
  // Only force a redirect when an explicit target was requested.
  if (user && redirectTo && isEmailVerified(user)) {
    redirect(redirectTo);
  }
  const errorMessage = searchParams?.error;
  const successMessage = searchParams?.success;
  const showResendPrompt = Boolean(errorMessage?.toLowerCase().includes("confirmado"));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center px-5 py-10 text-center sm:py-16">
      <Image src="/icono-oscuro.svg" alt="" width={64} height={64} aria-hidden="true" />

      <h1 className="mt-5 font-heading text-[28px] text-cordero-espresso">{COPY.auth.title}</h1>
      <p className="mt-2 text-sm text-[hsl(var(--color-espresso)/0.6)]">{COPY.auth.subtitle}</p>

      {errorMessage ? (
        <p className="mt-6 w-full rounded-2xl border border-[hsl(var(--color-terracotta)/0.3)] bg-[hsl(var(--color-terracotta)/0.1)] px-4 py-3 text-left text-sm text-[hsl(var(--color-terracotta-dark))]">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-6 w-full rounded-2xl bg-cordero-card px-4 py-3 text-left text-sm text-cordero-espresso shadow-cordero-card">
          {successMessage}
        </p>
      ) : null}

      <form
        action={signInAction}
        className="mt-6 w-full rounded-[20px] bg-cordero-card p-6 text-left shadow-cordero-card"
      >
        {redirectTo ? <input type="hidden" name="redirectTo" value={redirectTo} /> : null}

        <label
          className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.55)]"
          htmlFor="email"
        >
          {COPY.auth.emailLabel}
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-[hsl(var(--color-espresso)/0.2)] bg-transparent px-4 py-[13px] text-sm text-cordero-espresso outline-none focus:border-[hsl(var(--color-espresso)/0.4)]"
          id="email"
          name="email"
          type="email"
          required
        />

        <label
          className="mt-4 block text-[11px] font-semibold uppercase tracking-[0.08em] text-[hsl(var(--color-espresso)/0.55)]"
          htmlFor="password"
        >
          {COPY.auth.passwordLabel}
        </label>
        <input
          className="mt-2 w-full rounded-2xl border border-[hsl(var(--color-espresso)/0.2)] bg-transparent px-4 py-[13px] text-sm text-cordero-espresso outline-none focus:border-[hsl(var(--color-espresso)/0.4)]"
          id="password"
          name="password"
          type="password"
          required
        />

        <div className="mt-2 text-right">
          <Link
            className="text-[13px] text-[hsl(var(--color-espresso)/0.6)] underline hover:opacity-100"
            href="/acceso/recuperar"
          >
            {COPY.auth.forgotPassword}
          </Link>
        </div>

        <button
          className="btn-press mt-6 w-full rounded-full bg-cordero-espresso py-3.5 text-[15px] font-semibold text-cordero-cream"
          type="submit"
        >
          {COPY.auth.loginButton}
        </button>

        {showResendPrompt ? (
          <details className="mt-4 rounded-2xl border border-[hsl(var(--color-espresso)/0.12)] p-3 open:pb-4">
            <summary className="cursor-pointer text-xs text-[hsl(var(--color-espresso)/0.7)] underline">
              {COPY.auth.resendConfirmationButton}
            </summary>
            <form action={resendConfirmationAction} className="mt-3 flex flex-col gap-2 sm:flex-row">
              <input
                className="w-full flex-1 rounded-full border border-[hsl(var(--color-espresso)/0.2)] bg-transparent px-4 py-2 text-sm text-cordero-espresso outline-none"
                name="email"
                type="email"
                placeholder={COPY.auth.emailLabel}
                required
              />
              <button
                className="btn-press rounded-full bg-cordero-espresso px-4 py-2 text-xs font-semibold text-cordero-cream"
                type="submit"
              >
                {COPY.auth.resendConfirmationButton}
              </button>
            </form>
          </details>
        ) : null}
      </form>

      <div className="mt-5 flex w-full items-center gap-3">
        <span className="h-px flex-1 bg-[hsl(var(--color-espresso)/0.12)]" />
        <span className="text-xs text-[hsl(var(--color-espresso)/0.5)]">o</span>
        <span className="h-px flex-1 bg-[hsl(var(--color-espresso)/0.12)]" />
      </div>

      <Link
        href="/acceso/registro"
        className="btn-press mt-5 w-full rounded-full border border-[hsl(var(--color-espresso)/0.25)] py-3.5 text-[15px] font-semibold text-cordero-espresso"
      >
        {COPY.auth.registerButton}
      </Link>

      <Link
        href="/pedido"
        className="mt-4 text-sm text-[hsl(var(--color-espresso)/0.6)] underline"
      >
        {COPY.actions.continueAsGuest}
      </Link>

      <Link href="/" className="mt-6 text-xs text-[hsl(var(--color-espresso)/0.45)] underline">
        {COPY.actions.backToHome}
      </Link>
    </main>
  );
}
