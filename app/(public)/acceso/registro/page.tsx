import Link from "next/link";

import { signUpAction } from "@/app/(public)/acceso/actions";
import { COPY } from "@/lib/copy";

type RegistroPageProps = {
  searchParams?: {
    error?: string;
    success?: string;
  };
};

export default function RegistroPage({ searchParams }: RegistroPageProps) {
  const errorMessage = searchParams?.error;
  const successMessage = searchParams?.success;

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 py-16 sm:px-10">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Cordero Coffee Club
      </span>

      <h1 className="mt-5 font-heading text-4xl text-cordero-espresso sm:text-5xl">{COPY.auth.registerButton}</h1>
      <p className="mt-3 text-cordero-espresso opacity-80">{COPY.auth.subtitle}</p>

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

      <form action={signUpAction} className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6">
        <label className="block text-sm" htmlFor="email">
          {COPY.auth.emailLabel}
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cordero-espresso/30"
          id="email"
          name="email"
          type="email"
          required
        />

        <label className="mt-4 block text-sm" htmlFor="password">
          {COPY.auth.passwordLabel}
        </label>
        <input
          className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cordero-espresso/30"
          id="password"
          name="password"
          type="password"
          minLength={8}
          required
        />

        <button
          className="mt-6 w-full rounded-full bg-cordero-espresso px-5 py-2 text-sm font-medium text-cordero-cream"
          type="submit"
        >
          {COPY.auth.registerButton}
        </button>
      </form>

      <div className="mt-6 flex flex-wrap gap-4">
        <Link
          className="rounded-full bg-cordero-espresso/10 px-5 py-2 text-sm font-medium text-cordero-espresso"
          href="/acceso"
        >
          {COPY.auth.hasAccount} {COPY.auth.loginButton}
        </Link>
      </div>

      <div className="mt-4 flex flex-wrap gap-4">
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
