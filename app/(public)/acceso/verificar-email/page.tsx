"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { COPY } from "@/lib/copy";

function VerificarEmailFallback() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 py-8 sm:px-10 sm:py-14">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Cordero Coffee Club
      </span>
      <h1 className="mt-5 font-heading text-4xl text-cordero-espresso sm:text-5xl">Verificando tu correo...</h1>
      <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6" role="status">
        <p className="text-sm text-cordero-espresso opacity-70">Cargando estado de verificación...</p>
      </div>
    </main>
  );
}

function VerificarEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState<string>("");

  useEffect(() => {
    async function verifyEmail() {
      if (!token) {
        setStatus("error");
        setMessage("Token de verificación no válido. Por favor, solicita un nuevo enlace.");
        return;
      }

      try {
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const data = (await response.json()) as {
          success?: boolean;
          message?: string;
          error?: string;
        };

        if (!response.ok || !data.success) {
          setStatus("error");
          setMessage(
            data.error || "No pudimos verificar tu correo. Por favor, intenta de nuevo.",
          );
          return;
        }

        setStatus("success");
        setMessage(data.message || "¡Tu correo ha sido verificado exitosamente!");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/acceso?success=Correo%20verificado.%20Ahora%20puedes%20iniciar%20sesión.");
        }, 3000);
      } catch (error) {
        console.error("Email verification error:", error);
        setStatus("error");
        setMessage("Ocurrió un error al verificar tu correo. Por favor, intenta de nuevo.");
      }
    }

    verifyEmail();
  }, [token, router]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-md px-6 py-8 sm:py-14 sm:px-10">
      <span className="rounded-full border border-cordero bg-cordero-card px-4 py-1 text-xs uppercase tracking-[0.2em] text-cordero-espresso opacity-80">
        Cordero Coffee Club
      </span>

      <h1 className="mt-5 font-heading text-4xl text-cordero-espresso sm:text-5xl">
        Verificando tu correo...
      </h1>

      <div className="mt-8 rounded-2xl border border-cordero bg-cordero-card p-6">
        {status === "loading" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-cordero border-t-cordero-espresso"></div>
            <p className="mt-4 text-center text-sm text-cordero-espresso opacity-70">
              Un momento, estamos verificando tu correo...
            </p>
          </div>
        ) : status === "success" ? (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-4xl">✓</div>
            <p className="mt-4 text-center text-sm text-cordero-espresso">{message}</p>
            <p className="mt-3 text-xs text-cordero-espresso opacity-60">
              Redirigiendo a inicio de sesión...
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8">
            <div className="text-4xl">✗</div>
            <p className="mt-4 text-center text-sm text-cordero-espresso">{message}</p>
          </div>
        )}
      </div>

      {status === "error" ? (
        <div className="mt-6 flex flex-wrap gap-4">
          <Link className="flex-1 rounded-full border border-cordero px-5 py-2 text-center text-sm" href="/acceso">
            Volver al inicio
          </Link>
          <Link
            className="flex-1 rounded-full bg-cordero-espresso px-5 py-2 text-center text-sm text-cordero-cream"
            href="/acceso?showResend=true"
          >
            Reenviar correo
          </Link>
        </div>
      ) : null}

      {status === "success" ? (
        <div className="mt-6 flex flex-wrap gap-4">
          <Link className="w-full rounded-full border border-cordero px-5 py-2 text-center text-sm" href="/acceso">
            Ir a inicio de sesión
          </Link>
        </div>
      ) : null}
    </main>
  );
}

export default function VerificarEmailPage() {
  return (
    <Suspense fallback={<VerificarEmailFallback />}>
      <VerificarEmailContent />
    </Suspense>
  );
}
