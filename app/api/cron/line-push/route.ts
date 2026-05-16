import { NextResponse } from "next/server";
import { lineEnv } from "@/lib/line/env";
import { pushMessage, textMessage } from "@/lib/line/client";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDailyBrief } from "@/lib/line/daily-brief";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Vercel cron handler — runs daily at 00:30 UTC (08:30 Asia/Taipei).
 *
 * Vercel auto-injects CRON_SECRET as `Authorization: Bearer <secret>`
 * when crons are configured in vercel.json. We verify when present so
 * casual scrapers can't trigger pushes.
 */
export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return new NextResponse("unauthorized", { status: 401 });
    }
  }

  const { channelAccessToken } = lineEnv();
  if (!channelAccessToken) {
    return NextResponse.json({
      ok: true,
      skipped: "missing_LINE_CHANNEL_ACCESS_TOKEN",
    });
  }

  const admin = createAdminClient();
  const { data: bindings, error } = await admin
    .from("line_bindings")
    .select("user_id, line_user_id")
    .is("unbound_at", null);
  if (error) {
    console.error("[cron line-push] list bindings failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }

  let pushed = 0;
  let skipped = 0;
  let failed = 0;

  for (const b of bindings ?? []) {
    try {
      const brief = await buildDailyBrief(b.user_id as string);
      // Skip the push entirely when there's nothing to tell them today.
      // Pushes cost message quota; reaching out with "今天沒事" wastes it.
      if (!brief.hasContent) {
        skipped++;
        continue;
      }
      const result = await pushMessage(
        channelAccessToken,
        b.line_user_id as string,
        [textMessage(brief.text)],
      );
      if (result.ok) pushed++;
      else {
        failed++;
        console.error(
          `[cron line-push] push failed for ${b.line_user_id}: ${result.status} ${result.body ?? ""}`,
        );
      }
    } catch (err) {
      failed++;
      console.error(
        `[cron line-push] handler failed for ${b.line_user_id}:`,
        err instanceof Error ? err.message : err,
      );
    }
  }

  return NextResponse.json({
    ok: true,
    bindings: bindings?.length ?? 0,
    pushed,
    skipped,
    failed,
  });
}
