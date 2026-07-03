"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";

import { NotificationBell } from "@/components/notifications/notification-bell";

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

  const firstName = profileName?.trim().split(/\s+/)[0] ?? null;
  const greeting = firstName ? `Hola, ${firstName}` : "Hola";

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-3">
        <Image
          src="/icono-oscuro.svg"
          alt=""
          width={38}
          height={38}
          className="mt-0.5 flex-shrink-0"
          aria-hidden="true"
        />
        <div>
          <h1 className="font-heading text-[28px] leading-tight text-cordero-espresso">{greeting}</h1>
          <p className="mt-0.5 text-[15px] text-[hsl(var(--color-espresso)/0.6)]">¿Qué tomas hoy?</p>
        </div>
      </div>

      <div className="flex flex-shrink-0 items-center gap-2 pt-1">
        {userEmail ? (
          <>
            <NotificationBell />
            {rewardPoints !== null && (
              <div className="relative">
                <button
                  ref={buttonRef}
                  type="button"
                  onClick={() => setShowPopup((v) => !v)}
                  className="btn-press flex items-center gap-1.5 rounded-full border border-[hsl(var(--color-espresso)/0.12)] bg-cordero-card px-3 py-1.5 text-xs font-medium text-cordero-espresso"
                >
                  <span className="h-2 w-2 rounded-full bg-[hsl(var(--color-terracotta))]" />
                  {rewardPoints} pts
                </button>
                {showPopup && (
                  <div
                    ref={popupRef}
                    className="absolute right-0 top-full z-30 mt-2 w-72 rounded-2xl border border-[hsl(var(--color-espresso)/0.1)] bg-cordero-card p-5 shadow-lg"
                  >
                    <h3 className="mb-2 text-sm font-semibold text-cordero-espresso">
                      ¿Cómo acumular puntos?
                    </h3>
                    <ul className="space-y-2 text-xs leading-relaxed text-[hsl(var(--color-espresso)/0.8)]">
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
                        <span>Acumula puntos y accede a recompensas exclusivas próximamente.</span>
                      </li>
                    </ul>
                    <p className="mt-3 border-t border-[hsl(var(--color-espresso)/0.1)] pt-3 text-center text-[11px] text-[hsl(var(--color-espresso)/0.5)]">
                      Tus puntos: <strong>{rewardPoints}</strong>
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        ) : (
          <Link
            href="/acceso"
            className="btn-press rounded-full border border-[hsl(var(--color-espresso)/0.25)] px-4 py-1.5 text-xs font-semibold text-cordero-espresso"
          >
            Iniciar sesión
          </Link>
        )}
      </div>
    </div>
  );
}
