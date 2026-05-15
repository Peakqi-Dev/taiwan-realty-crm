"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export interface BetaActionState {
  ok?: boolean;
  error?: string;
  email?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function applyForBetaAction(
  _prev: BetaActionState,
  formData: FormData,
): Promise<BetaActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const lineId = String(formData.get("lineId") ?? "").trim();
  const agency = String(formData.get("agency") ?? "").trim();
  const monthlyClients = String(formData.get("monthlyClients") ?? "").trim();

  if (!name) return { error: "請輸入姓名" };
  if (!email || !EMAIL_REGEX.test(email)) return { error: "請輸入正確的 Email" };
  if (!phone) return { error: "請輸入電話" };

  // Save the application first so we don't lose it if email later fails.
  const admin = createAdminClient();
  const { error: insertErr } = await admin.from("beta_applications").insert({
    email,
    name,
    phone,
    line_id: lineId || null,
    agency: agency || null,
    monthly_clients: monthlyClients || null,
  });
  if (insertErr) {
    console.error("[beta] insert failed:", insertErr.message);
    return { error: "送出失敗，請稍後再試。" };
  }

  // Trigger magic-link email. signInWithOtp auto-creates the account on first
  // visit (Supabase setting "Enable email signups" must be on, which is the
  // default for the Vercel Marketplace Supabase integration).
  const supabase = createClient();
  const { error: otpErr } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      data: { display_name: name },
    },
  });
  if (otpErr) {
    console.error("[beta] OTP send failed:", otpErr.message);
    // Application is already saved — we can recover by resending later.
    return {
      ok: true,
      email,
      error: "申請已收到，但 Email 寄送遇到問題。請手動聯絡管理員或稍後重試。",
    };
  }

  return { ok: true, email };
}
