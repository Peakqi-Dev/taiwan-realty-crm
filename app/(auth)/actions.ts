"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

interface ActionState {
  error?: string;
}

export async function signInAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/app") || "/app";

  if (!email || !password) {
    return { error: "請輸入電子郵件與密碼" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return { error: translateAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  redirect(next.startsWith("/") ? next : "/app");
}

export async function signUpAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const displayName = String(formData.get("displayName") ?? "").trim();

  if (!email || !password) {
    return { error: "請輸入電子郵件與密碼" };
  }
  if (password.length < 6) {
    return { error: "密碼至少需要 6 個字元" };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { display_name: displayName || email.split("@")[0] },
    },
  });
  if (error) {
    return { error: translateAuthError(error.message) };
  }

  revalidatePath("/", "layout");
  // 若 Supabase 設定為「需 email 確認」,使用者會被導去 /login + 提示。
  // 預設 Vercel-Supabase 整合會關閉確認,可直接登入。
  redirect("/app");
}

export async function signOutAction() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

function translateAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "帳號或密碼錯誤";
  if (m.includes("email not confirmed")) return "請先至信箱完成驗證";
  if (m.includes("user already registered")) return "此電子郵件已註冊";
  if (m.includes("rate limit")) return "嘗試次數過多,請稍後再試";
  return message;
}
