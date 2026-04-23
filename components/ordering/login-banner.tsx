"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";

interface LoginBannerProps {
  userEmail: string | null;
  profileName: string | null;
  rewardPoints: number | null;
}

export function LoginBanner({ userEmail, profileName, rewardPoints }: LoginBannerProps) {
  const [showPopup, setShowPopup] = useState(false);
  const popupRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        popupRef.current &&
        !popupRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPopup(false);
      }
    }
    if (showPopup) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showPopup]);

  if (userEmail) {
    return (
      <div className="sticky top-0 z-40 w-full border-b border-cordero bg-cordero-card px-6 py-3 text-sm text-cordero-espresso sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <p className="opacity-70">Bienvenido, {profileName ?? userEmail}</p>
          {rewardPoints !== null && (
            <div className="relative">
              <button
                ref={buttonRef}
                onClick={() => setShowPopup((v) => !v)}
                className="rounded-full border border-cordero px-3 py-0.5 text-xs opacity-70 transition-opacity hover:opacity-100"
              >
                {rewardPoints} puntos de recompensa
              </button>
              {showPopup && (
                <div
                  ref={popupRef}
                  className="absolute right-0 top-full mt-2 w-72 rounded-xl border border-cordero bg-cordero-card p-5 shadow-lg"
                >
                  <h3 className="mb-2 text-sm font-bold text-cordero-espresso">
                    ¿Cómo acumular puntos?
                  </h3>
                  <ul className="space-y-2 text-xs leading-relaxed text-cordero-espresso/80">
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-sm">☕</span>
                      <span>
                        Ganas <strong>10 puntos por cada producto</strong> que pidas en tu orden.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-sm">📦</span>
                      <span>
                        Los puntos se acreditan cuando tu pedido es <strong>entregado</strong>.
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 text-sm">🎁</span>
                      <span>
                        Acumula puntos y accede a recompensas exclusivas próximamente.
                      </span>
                    </li>
                  </ul>
                  <p className="mt-3 border-t border-cordero pt-3 text-center text-[11px] text-cordero-espresso/50">
                    Tus puntos: <strong>{rewardPoints}</strong>
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 w-full bg-cordero-espresso px-6 py-3 text-center text-sm sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-cordero-cream opacity-75">
          Modo invitado: inicia sesión para guardar tu historial y ganar puntos
        </span>
        <Link
          href="/acceso"
          className="rounded-full border border-cordero-cream/40 px-4 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cordero-cream transition-opacity duration-200 hover:opacity-80"
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}
