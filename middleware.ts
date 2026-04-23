import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getPublicEnv } from "@/lib/config/env";
import {
  getEmailVerificationErrorMessage,
  isEmailVerified,
} from "@/lib/supabase/email-verification";
import type { Database } from "@/lib/types/database";

function redirectToHome(request: NextRequest, errorMessage?: string) {
  const accessUrl = new URL("/acceso", request.url);
  const nextPath = `${request.nextUrl.pathname}${request.nextUrl.search}`;
  accessUrl.searchParams.set("redirectTo", nextPath);

  if (errorMessage) {
    accessUrl.searchParams.set("error", errorMessage);
  }

  return NextResponse.redirect(accessUrl);
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

  if (user && !isEmailVerified(user) && request.nextUrl.pathname.startsWith("/pedido")) {
    return redirectToHome(request, getEmailVerificationErrorMessage());
  }

  // Admin-only protection
  if (request.nextUrl.pathname.startsWith("/admin")) {
    if (!user) {
      return redirectToHome(request);
    }

    if (!isEmailVerified(user)) {
      return redirectToHome(request, getEmailVerificationErrorMessage());
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    if (error || !profile) {
      return redirectToHome(request);
    }

    const typedProfile = profile as unknown as { role: "guest" | "customer" | "employee" | "admin" | "super_admin" };

    if (
      typedProfile.role !== "admin" &&
      typedProfile.role !== "super_admin" &&
      typedProfile.role !== "employee"
    ) {
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
