import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

interface PairRequest {
  code?: string;
  customerLineUserId?: string;
}

/**
 * Records a customer → agent pairing started from /r/<short_code> + the LIFF
 * flow on /line/connect?pair=<short_code>. Idempotent: a re-scan upserts the
 * same row. Webhook consumes this row when the follow event arrives.
 */
export async function POST(request: Request) {
  let body: PairRequest;
  try {
    body = (await request.json()) as PairRequest;
  } catch {
    return NextResponse.json({ ok: false, error: "bad_json" }, { status: 400 });
  }

  const code = body.code?.trim();
  const customerLineUserId = body.customerLineUserId?.trim();
  if (!code || !customerLineUserId) {
    return NextResponse.json(
      { ok: false, error: "missing_fields" },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  const { data: agent, error: agentErr } = await admin
    .from("agent_profiles")
    .select("user_id, display_name")
    .eq("short_code", code)
    .maybeSingle();
  if (agentErr) {
    console.error("[/api/line/pair] agent lookup failed:", agentErr.message);
    return NextResponse.json({ ok: false, error: "lookup_failed" }, { status: 500 });
  }
  if (!agent) {
    return NextResponse.json({ ok: false, error: "agent_not_found" }, { status: 404 });
  }

  const { error: upsertErr } = await admin
    .from("customer_pairings")
    .upsert(
      {
        customer_line_user_id: customerLineUserId,
        agent_user_id: agent.user_id,
        bound_at: null,
      },
      { onConflict: "customer_line_user_id,agent_user_id" },
    );
  if (upsertErr) {
    console.error("[/api/line/pair] upsert failed:", upsertErr.message);
    return NextResponse.json({ ok: false, error: "upsert_failed" }, { status: 500 });
  }

  const addFriendUrl =
    process.env.NEXT_PUBLIC_LINE_ADD_FRIEND_URL ||
    (process.env.NEXT_PUBLIC_LIFF_ID
      ? `https://liff.line.me/${process.env.NEXT_PUBLIC_LIFF_ID}`
      : "");

  return NextResponse.json({
    ok: true,
    agentName: agent.display_name,
    addFriendUrl,
  });
}
