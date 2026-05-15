import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const PROD_BASE = "https://taiwan-realty-crm.vercel.app";

/**
 * POST { lineUserId } → look up the active binding → generate a one-time
 * magic-link URL for that user and return it. The LIFF page navigates to
 * the URL and Supabase completes the sign-in + redirect to /app.
 */
export async function POST(request: Request) {
  let body: { lineUserId?: string; redirectTo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "bad_json" },
      { status: 400 },
    );
  }

  const lineUserId = body.lineUserId?.trim();
  if (!lineUserId) {
    return NextResponse.json(
      { ok: false, error: "missing_lineUserId" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: binding } = await admin
    .from("line_bindings")
    .select("user_id, unbound_at")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (!binding || binding.unbound_at) {
    return NextResponse.json(
      { ok: false, error: "no_binding" },
      { status: 404 },
    );
  }

  const { data: userData } = await admin.auth.admin.getUserById(
    binding.user_id as string,
  );
  const email = userData?.user?.email;
  if (!email) {
    return NextResponse.json(
      { ok: false, error: "user_email_missing" },
      { status: 500 },
    );
  }

  // Origin-relative redirect_to gets resolved by Supabase against the project's
  // Site URL. We use the canonical production URL so it works from LIFF browser.
  const origin = new URL(request.url).origin;
  const baseUrl = origin.includes("localhost") ? origin : PROD_BASE;
  const redirectTo = body.redirectTo?.startsWith("/")
    ? `${baseUrl}${body.redirectTo}`
    : `${baseUrl}/app`;

  const { data: link, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo },
  });
  if (error || !link?.properties?.action_link) {
    console.error("[auto-login] generateLink failed:", error);
    return NextResponse.json(
      { ok: false, error: "link_generation_failed" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    ok: true,
    actionLink: link.properties.action_link,
  });
}
