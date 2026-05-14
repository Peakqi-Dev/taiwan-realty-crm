import { createClient } from "@supabase/supabase-js";
import { supabasePublicEnv } from "./env";

/**
 * Service-role Supabase client. Bypasses RLS — for use in webhook handlers and
 * cron jobs that have no end-user session. Never import this into a client component.
 */
export function createAdminClient() {
  const { url } = supabasePublicEnv();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceKey) {
    throw new Error(
      "Missing SUPABASE_SERVICE_ROLE_KEY. Required for server-side admin operations.",
    );
  }
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
