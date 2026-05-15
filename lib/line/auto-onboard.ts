import { createAdminClient } from "@/lib/supabase/admin";

/** Build a synthetic email from a LINE userId — internal-only, never delivered. */
export function syntheticEmailFor(lineUserId: string): string {
  return `${lineUserId.toLowerCase()}@line.local`;
}

export interface AutoOnboardResult {
  userId: string;
  created: boolean; // true if we created the user this call
  reactivated: boolean; // true if binding existed but was unbound
}

/**
 * Ensure a Supabase user + active line_binding exists for the given LINE
 * userId. Idempotent: re-following just reactivates the existing binding.
 */
export async function autoOnboardLineUser(
  lineUserId: string,
  displayName: string,
): Promise<AutoOnboardResult> {
  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("line_bindings")
    .select("user_id, unbound_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (existing) {
    if (existing.unbound_at) {
      await admin
        .from("line_bindings")
        .update({ unbound_at: null, bound_at: new Date().toISOString() })
        .eq("line_user_id", lineUserId);
      return {
        userId: existing.user_id as string,
        created: false,
        reactivated: true,
      };
    }
    return { userId: existing.user_id as string, created: false, reactivated: false };
  }

  const email = syntheticEmailFor(lineUserId);
  // Defensive: if a user already exists with this synthetic email, reuse it
  // (e.g. binding got deleted but auth.users row survived).
  const { data: lookup } = await admin.auth.admin.listUsers({ perPage: 200 });
  const existingUser = lookup?.users?.find((u) => u.email === email);
  let userId: string;
  let created = false;
  if (existingUser) {
    userId = existingUser.id;
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { display_name: displayName, line_user_id: lineUserId },
    });
    if (error || !data?.user) {
      throw new Error(`createUser failed: ${error?.message ?? "unknown"}`);
    }
    userId = data.user.id;
    created = true;
  }

  await admin.from("line_bindings").insert({
    user_id: userId,
    line_user_id: lineUserId,
    bound_at: new Date().toISOString(),
  });

  return { userId, created, reactivated: false };
}
