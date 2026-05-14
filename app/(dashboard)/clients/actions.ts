"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { ClientStatus, ClientType } from "@/lib/types";

export interface ClientActionState {
  error?: string;
}

function parseBody(formData: FormData) {
  const budgetMinRaw = String(formData.get("budgetMin") ?? "").trim();
  const budgetMaxRaw = String(formData.get("budgetMax") ?? "").trim();
  const lineId = String(formData.get("lineId") ?? "").trim();
  return {
    name: String(formData.get("name") ?? "").trim(),
    phone: String(formData.get("phone") ?? "").trim(),
    line_id: lineId ? lineId : null,
    type: String(formData.get("type") ?? "買方") as ClientType,
    status: String(formData.get("status") ?? "新客戶") as ClientStatus,
    budget_min: budgetMinRaw ? Number(budgetMinRaw) : null,
    budget_max: budgetMaxRaw ? Number(budgetMaxRaw) : null,
    preferred_districts: formData
      .getAll("preferredDistricts")
      .map((v) => String(v))
      .filter(Boolean),
    requirements: String(formData.get("requirements") ?? "").trim(),
  };
}

export async function createClientAction(
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const body = parseBody(formData);
  if (!body.name || !body.phone) {
    return { error: "請填寫客戶姓名與電話" };
  }
  if (
    body.budget_min !== null &&
    body.budget_max !== null &&
    body.budget_min > body.budget_max
  ) {
    return { error: "預算下限不能高於上限" };
  }

  const { data, error } = await supabase
    .from("clients")
    .insert({ ...body, assigned_to: user.id })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/");
  redirect(`/clients/${data.id}`);
}

export async function updateClientAction(
  id: string,
  _prev: ClientActionState,
  formData: FormData,
): Promise<ClientActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const body = parseBody(formData);
  if (!body.name || !body.phone) {
    return { error: "請填寫客戶姓名與電話" };
  }
  if (
    body.budget_min !== null &&
    body.budget_max !== null &&
    body.budget_min > body.budget_max
  ) {
    return { error: "預算下限不能高於上限" };
  }

  const { error } = await supabase.from("clients").update(body).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  revalidatePath("/");
  redirect(`/clients/${id}`);
}

export async function deleteClientAction(
  id: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/clients");
  revalidatePath("/");
  return {};
}
