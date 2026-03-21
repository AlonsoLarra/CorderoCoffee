import Link from "next/link";

import { signInAction, signUpAction } from "@/app/(public)/acceso/actions";
import { COPY } from "@/lib/copy";

type AccessPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

export default function AccessPage({ searchParams }: AccessPageProps) {
  const errorMessage = searchParams?.error;
  const successMessage = searchParams?.success;

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-16 sm:px-10">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Cordero Coffee Club
      </span>

      <h1 className="mt-5 font-heading text-4xl text-cordero-espresso sm:text-5xl">{COPY.auth.title}</h1>
      <p className="mt-3 max-w-2xl text-cordero-espresso opacity-80">{COPY.auth.subtitle}</p>

      {errorMessage ? (
        <p className="mt-6 rounded-xl border border-cordero bg-cordero-card px-4 py-3 text-sm text-cordero-espresso">
          {errorMessage}
        </p>
      ) : null}

      {successMessage ? (
        <p className="mt-6 rounded-xl border border-cordero bg-cordero-card px-4 py-3 text-sm text-cordero-espresso">
          {successMessage}
        </p>
      ) : null}

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <form action={signInAction} className="rounded-2xl border border-cordero bg-cordero-card p-6">
          <h2 className="font-heading text-2xl">{COPY.auth.loginButton}</h2>

          <label className="mt-4 block text-sm" htmlFor="login-email">
            {COPY.auth.emailLabel}
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cordero-espresso/30"
            id="login-email"
            name="email"
            type="email"
            required
          />

          <label className="mt-4 block text-sm" htmlFor="login-password">
            {COPY.auth.passwordLabel}
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cordero-espresso/30"
            id="login-password"
            name="password"
            type="password"
            required
          />

          <button
            className="mt-6 w-full rounded-full bg-cordero-espresso px-5 py-2 text-sm font-medium text-cordero-cream"
            type="submit"
          >
            {COPY.auth.loginButton}
          </button>
        </form>

        <form action={signUpAction} className="rounded-2xl border border-cordero bg-cordero-card p-6">
          <h2 className="font-heading text-2xl">{COPY.auth.registerButton}</h2>

          <label className="mt-4 block text-sm" htmlFor="register-email">
            {COPY.auth.emailLabel}
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cordero-espresso/30"
            id="register-email"
            name="email"
            type="email"
            required
          />

          <label className="mt-4 block text-sm" htmlFor="register-password">
            {COPY.auth.passwordLabel}
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cordero-espresso/30"
            id="register-password"
            name="password"
            type="password"
            minLength={8}
            required
          />

          <button
            className="mt-6 w-full rounded-full border border-cordero px-5 py-2 text-sm font-medium text-cordero-espresso"
            type="submit"
          >
            {COPY.auth.registerButton}
          </button>
        </form>
      </div>

      <div className="mt-8 flex flex-wrap gap-4">
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/pedido">
          {COPY.actions.continueAsGuest}
        </Link>
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/">
          {COPY.actions.backToHome}
        </Link>
      </div>
    </main>
  );
}
