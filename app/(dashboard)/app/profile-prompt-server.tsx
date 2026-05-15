import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProfilePrompt } from "./profile-prompt";

function isSynthetic(email?: string | null): boolean {
  return !!email && email.endsWith("@line.local");
}

/**
 * Server wrapper — decides whether to render the dashboard's "fill in your
 * details" prompt based on the user's auth email and beta_applications row.
 */
export async function ProfilePromptServer() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const hasSyntheticEmail = isSynthetic(user.email);

  const admin = createAdminClient();
  const { data: beta } = await admin
    .from("beta_applications")
    .select("phone")
    .eq("email", user.email ?? "")
    .maybeSingle();
  const hasPhone = !!(beta as { phone?: string } | null)?.phone;

  // Hide entirely if the user has both a real email and a phone.
  if (!hasSyntheticEmail && hasPhone) return null;

  return (
    <ProfilePrompt hasSyntheticEmail={hasSyntheticEmail} hasPhone={hasPhone} />
  );
}
