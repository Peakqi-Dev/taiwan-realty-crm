import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabasePublicEnv } from "./env";

/**
 * Server-side Supabase client for Server Components, Server Actions, and Route Handlers.
 * Reads + writes the session cookie via Next's cookies() helper.
 *
 * In Server Components the setAll path is a no-op (Next forbids cookie writes there);
 * the actual refresh happens in middleware.ts.
 */
export function createClient() {
  const { url, anonKey } = supabasePublicEnv();
  const cookieStore = cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Called from a Server Component — middleware refreshes the cookie instead.
        }
      },
    },
  });
}
