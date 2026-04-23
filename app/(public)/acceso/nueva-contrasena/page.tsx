"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { COPY } from "@/lib/copy";

export default function NuevaContrasenaPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [flowType, setFlowType] = useState<"custom" | "supabase" | null>(null);

  useEffect(() => {
    // Check if we have a custom token or if Supabase is handling it
    if (token) {
      setFlowType("custom");
      setIsReady(true);
    } else {
      // Supabase places auth tokens in the URL hash after the password reset link is clicked.
      const supabase = createSupabaseBrowserClient();

      const { data: listener } = supabase.auth.onAuthStateChange((event) => {
        if (event === "PASSWORD_RECOVERY") {
          setFlowType("supabase");
          setIsReady(true);
        }
      });

      return () => {
        listener.subscription.unsubscribe();
      };
    }
  }, [token]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const password = (formData.get("password") as string).trim();
    const confirmPassword = (formData.get("confirmPassword") as string).trim();

    if (password.length < 8) {
      setError(COPY.auth.newPasswordMinLength);
      setIsSubmitting(false);
      return;
    }

    if (password !== confirmPassword) {
      setError(COPY.auth.newPasswordMismatch);
      setIsSubmitting(false);
      return;
    }

    try {
      if (flowType === "custom" && token) {
        // Use custom token endpoint
        const response = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        });

        if (!response.ok) {
          const data = (await response.json()) as { error?: string };
          setError(data.error || COPY.auth.errorGeneric);
          setIsSubmitting(false);
          return;
        }

        setSuccess(true);
        setTimeout(() => router.push("/acceso"), 3000);
      } else if (flowType === "supabase") {
        // Use Supabase's built-in update
        const supabase = createSupabaseBrowserClient();
        const { error: updateError } = await supabase.auth.updateUser({ password });

        if (updateError) {
          setError(COPY.auth.errorGeneric);
          setIsSubmitting(false);
          return;
        }

        setSuccess(true);
        setTimeout(() => router.push("/acceso"), 3000);
      }
    } catch (err) {
      console.error("Password reset error:", err);
      setError(COPY.auth.errorGeneric);
      setIsSubmitting(false);
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 py-8 sm:py-14 sm:px-10">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Cordero Coffee Club
      </span>

      <h1 className="mt-5 font-heading text-4xl text-cordero-espresso sm:text-5xl">
        {COPY.auth.newPasswordTitle}
      </h1>
      <p className="mt-3 text-cordero-espresso opacity-80">{COPY.auth.newPasswordSubtitle}</p>

      {error ? (
        <p className="mt-6 rounded-xl border border-cordero bg-cordero-card px-4 py-3 text-sm text-cordero-espresso">
          {error}
        </p>
      ) : null}

      {success ? (
        <p className="mt-6 rounded-xl border border-cordero bg-cordero-card px-4 py-3 text-sm text-cordero-espresso">
          {COPY.auth.newPasswordSuccess}
        </p>
      ) : null}

      {!success && isReady ? (
        <form onSubmit={handleSubmit} className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6">
          <label className="block text-sm" htmlFor="password">
            {COPY.auth.newPasswordLabel}
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cordero-espresso/30"
            id="password"
            name="password"
            type="password"
            minLength={8}
            required
            disabled={isSubmitting}
          />

          <label className="mt-4 block text-sm" htmlFor="confirmPassword">
            {COPY.auth.newPasswordConfirmLabel}
          </label>
          <input
            className="mt-2 w-full rounded-xl border border-cordero bg-transparent px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cordero-espresso/30"
            id="confirmPassword"
            name="confirmPassword"
            type="password"
            minLength={8}
            required
            disabled={isSubmitting}
          />

          <button
            className="mt-6 w-full rounded-full bg-cordero-espresso px-5 py-2 text-sm font-medium text-cordero-cream disabled:opacity-50"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Procesando..." : COPY.auth.newPasswordButton}
          </button>
        </form>
      ) : null}

      {!success && !isReady ? (
        <p className="mt-8 text-sm text-cordero-espresso opacity-60">
          Verificando enlace...
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-4">
        <Link className="rounded-full border border-cordero px-5 py-2 text-sm" href="/acceso">
          {COPY.auth.loginButton}
        </Link>
      </div>
    </main>
  );
}
