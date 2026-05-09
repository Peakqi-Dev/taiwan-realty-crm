/**
 * Reads the Supabase env vars provisioned by the Vercel Marketplace integration.
 * Throws if missing — call this only inside server / browser entrypoints, never at module top-level
 * in code that runs during build (otherwise prerender will fail before envs are wired).
 */
export function supabasePublicEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "Run `vercel env pull .env.local` after the Supabase Marketplace integration is provisioned.",
    );
  }
  return { url, anonKey };
}
