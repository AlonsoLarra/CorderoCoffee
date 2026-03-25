import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/config/env";
import type { Database } from "@/lib/types/database";

function redirectToHome(request: NextRequest) {
  return NextResponse.redirect(new URL("/", request.url));
}

export async function middleware(request: NextRequest) {
  const env = getPublicEnv();
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: "", ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: "", ...options });
        },
      },
    },
  );

  // Always call getUser() to refresh the session cookie on every request.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Admin-only protection
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return redirectToHome(request);
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile) {
      return redirectToHome(request);
    }

    const typedProfile = profile as unknown as { role: "guest" | "customer" | "admin" | "super_admin" };

    if (typedProfile.role !== "admin" && typedProfile.role !== "super_admin") {
      return redirectToHome(request);
    }
  }

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
