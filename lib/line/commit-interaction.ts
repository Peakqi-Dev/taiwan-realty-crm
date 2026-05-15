import { createAdminClient } from "@/lib/supabase/admin";
import type { InteractionDraft } from "@/lib/ai/classify-intent";

export interface MatchedClient {
  id: string;
  name: string;
}

export interface InteractionMatchResult {
  matches: MatchedClient[]; // 0, 1, or many
}

/** Fuzzy-find clients whose name contains the hint, scoped to one owner. */
export async function matchClientsByHint(
  ownerUserId: string,
  hint: string,
): Promise<InteractionMatchResult> {
  if (!hint) return { matches: [] };
  const admin = createAdminClient();
  // ILIKE with a pattern — Chinese is fine, no collation issues for substring.
  const { data, error } = await admin
    .from("clients")
    .select("id, name")
    .eq("assigned_to", ownerUserId)
    .ilike("name", `%${hint}%`)
    .limit(5);
  if (error || !data) return { matches: [] };
  return { matches: data as MatchedClient[] };
}

/** Resolve an optional property hint to a property_id (best effort). */
export async function matchPropertyByHint(
  ownerUserId: string,
  hint: string | null,
): Promise<string | null> {
  if (!hint) return null;
  const admin = createAdminClient();
  // Try title or district substring.
  const { data } = await admin
    .from("properties")
    .select("id")
    .eq("owner_id", ownerUserId)
    .or(`title.ilike.%${hint}%,district.ilike.%${hint}%,address.ilike.%${hint}%`)
    .limit(1);
  return (data?.[0] as { id?: string } | undefined)?.id ?? null;
}

export interface CommitInteractionResult {
  ok: boolean;
  error?: string;
  interactionId?: string;
}

export async function commitInteraction(
  ownerUserId: string,
  clientId: string,
  draft: InteractionDraft,
): Promise<CommitInteractionResult> {
  const admin = createAdminClient();
  const propertyId = await matchPropertyByHint(ownerUserId, draft.property_hint);

  const { data, error } = await admin
    .from("interactions")
    .insert({
      client_id: clientId,
      property_id: propertyId,
      type: draft.type,
      note: draft.note,
      created_by: ownerUserId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  // Bump client.last_contact_at so the dashboard list reorders.
  await admin
    .from("clients")
    .update({ last_contact_at: new Date().toISOString() })
    .eq("id", clientId);

  return { ok: true, interactionId: data.id };
}
