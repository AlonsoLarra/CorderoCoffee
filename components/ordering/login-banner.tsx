import Link from "next/link";

interface LoginBannerProps {
  userEmail: string | null;
  profileName: string | null;
  rewardPoints: number | null;
}

export function LoginBanner({ userEmail, profileName, rewardPoints }: LoginBannerProps) {
  if (userEmail) {
    return (
      <div className="sticky top-0 z-40 w-full border-b border-cordero bg-cordero-card px-6 py-3 text-sm text-cordero-espresso sm:px-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2">
          <p className="opacity-70">Bienvenido, {profileName ?? userEmail}</p>
          {rewardPoints !== null && (
            <span className="rounded-full border border-cordero px-3 py-0.5 text-xs opacity-70">
              {rewardPoints} puntos de recompensa
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-0 z-40 w-full bg-cordero-espresso px-6 py-3 text-center text-sm sm:px-10">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-center gap-3">
        <span className="text-[11px] uppercase tracking-[0.18em] text-cordero-cream opacity-75">
          Inicia sesión para guardar tu historial y ganar puntos
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
