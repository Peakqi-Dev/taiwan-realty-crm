"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { PropertyStatus, PropertyType } from "@/lib/types";

export interface PropertyActionState {
  error?: string;
}

function parseBody(formData: FormData) {
  return {
    title: String(formData.get("title") ?? "").trim(),
    address: String(formData.get("address") ?? "").trim(),
    district: String(formData.get("district") ?? "").trim(),
    price: Number(formData.get("price") ?? 0) || 0,
    type: String(formData.get("type") ?? "買賣") as PropertyType,
    rooms: Number(formData.get("rooms") ?? 0) || 0,
    bathrooms: Number(formData.get("bathrooms") ?? 0) || 0,
    area: Number(formData.get("area") ?? 0) || 0,
    floor: String(formData.get("floor") ?? "").trim(),
    total_floors: Number(formData.get("totalFloors") ?? 0) || 0,
    status: String(formData.get("status") ?? "委託中") as PropertyStatus,
    commission_deadline: String(formData.get("commissionDeadline") ?? "").trim(),
    description: String(formData.get("description") ?? "").trim(),
  };
}

export async function createPropertyAction(
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const body = parseBody(formData);
  if (!body.title || !body.address || !body.commission_deadline) {
    return { error: "請填寫物件名稱、地址與委託到期日" };
  }

  const { data, error } = await supabase
    .from("properties")
    .insert({ ...body, owner_id: user.id, images: [] })
    .select("id")
    .single();
  if (error) return { error: error.message };

  revalidatePath("/properties");
  revalidatePath("/");
  redirect(`/properties/${data.id}`);
}

export async function updatePropertyAction(
  id: string,
  _prev: PropertyActionState,
  formData: FormData,
): Promise<PropertyActionState> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const body = parseBody(formData);
  if (!body.title || !body.address || !body.commission_deadline) {
    return { error: "請填寫物件名稱、地址與委託到期日" };
  }

  const { error } = await supabase.from("properties").update(body).eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  revalidatePath("/");
  redirect(`/properties/${id}`);
}

export async function deletePropertyAction(
  id: string,
): Promise<{ error?: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "未登入" };

  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) return { error: error.message };

  revalidatePath("/properties");
  revalidatePath("/");
  return {};
}
