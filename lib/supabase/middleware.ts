import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { supabasePublicEnv } from "./env";

// Routes the user must be signed OUT to visit (we bounce signed-in users away).
const AUTH_ONLY_PATHS = ["/login", "/signup"];

// Routes anyone can visit, signed in or not.
const PUBLIC_PATHS = [
  "/",
  "/beta", // Beta application page
  "/auth/callback",
  "/line/connect", // LIFF binding page — handles its own auth flow
  ...AUTH_ONLY_PATHS,
];

function isPublic(pathname: string) {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isAuthOnly(pathname: string) {
  return AUTH_ONLY_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Refreshes the Supabase auth cookie on every request and gates protected routes.
 * Per Supabase guidance: do not run code between createServerClient and getUser.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const { url, anonKey } = supabasePublicEnv();

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(request.nextUrl.pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/login";
    redirect.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(redirect);
  }

  if (user && isAuthOnly(request.nextUrl.pathname)) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/app";
    redirect.searchParams.delete("next");
    return NextResponse.redirect(redirect);
  }

  return supabaseResponse;
}
