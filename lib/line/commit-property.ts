import { createAdminClient } from "@/lib/supabase/admin";
import type { PropertyDraft } from "@/lib/ai/classify-intent";

export interface CommitPropertyResult {
  ok: boolean;
  error?: string;
  propertyId?: string;
}

/**
 * Persist a property draft as a row in the properties table. Fills in
 * sensible defaults for fields the AI couldn't extract — type defaults to
 * 買賣, status to 委託中, commission_deadline to 30 days out, etc., so the
 * insert doesn't fail on NOT NULL columns. The user can refine later in
 * the web app or via the LINE edit flow.
 */
export async function commitPropertyDraft(
  ownerUserId: string,
  draft: PropertyDraft,
): Promise<CommitPropertyResult> {
  if (!draft.title) return { ok: false, error: "物件名稱未填，無法建檔。" };

  const admin = createAdminClient();
  const deadline30 = new Date(Date.now() + 30 * 86400_000)
    .toISOString()
    .slice(0, 10);

  const { data, error } = await admin
    .from("properties")
    .insert({
      title: draft.title,
      address: draft.address ?? "(LINE 建檔，地址待補)",
      district: draft.district ?? "未指定",
      price: draft.price ?? 0,
      type: draft.type ?? "買賣",
      status: draft.status ?? "委託中",
      rooms: draft.rooms ?? 0,
      bathrooms: draft.bathrooms ?? 0,
      area: draft.area ?? 0,
      floor: "",
      total_floors: 0,
      commission_deadline: deadline30,
      description: draft.description ?? "",
      images: [],
      owner_id: ownerUserId,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  return { ok: true, propertyId: data.id };
}

/** Format the draft for the LINE confirmation card. */
export function formatPropertyDraftForConfirm(draft: PropertyDraft): string {
  const lines: string[] = ["建檔："];
  lines.push(`• 物件：${draft.title ?? "（未填）"}`);
  if (draft.type) lines.push(`• 類型：${draft.type}`);
  if (draft.status) lines.push(`• 狀態：${draft.status}`);
  if (draft.district) lines.push(`• 區域：${draft.district}`);
  if (draft.price !== null)
    lines.push(`• 價格：${draft.price.toLocaleString("zh-TW")} 萬`);
  if (draft.rooms !== null || draft.bathrooms !== null) {
    const r = draft.rooms ?? 0;
    const b = draft.bathrooms ?? 0;
    if (r > 0 || b > 0) lines.push(`• 格局：${r} 房 ${b} 衛`);
  }
  if (draft.area !== null && draft.area > 0)
    lines.push(`• 坪數：${draft.area} 坪`);
  if (draft.address) lines.push(`• 地址：${draft.address}`);
  if (draft.description) lines.push(`• 備註：${draft.description}`);
  lines.push("");
  lines.push("回「對」確認建檔，或回「改價格 4500」這樣調整。");
  return lines.join("\n");
}

/** Merge a patch onto an existing draft — only non-null/non-empty fields win. */
export function patchPropertyDraft(
  current: PropertyDraft,
  patch: PropertyDraft,
): PropertyDraft {
  return {
    title: patch.title ?? current.title,
    address: patch.address ?? current.address,
    district: patch.district ?? current.district,
    price: patch.price ?? current.price,
    type: patch.type ?? current.type,
    status: patch.status ?? current.status,
    rooms: patch.rooms ?? current.rooms,
    bathrooms: patch.bathrooms ?? current.bathrooms,
    area: patch.area ?? current.area,
    description: patch.description || current.description,
  };
}
