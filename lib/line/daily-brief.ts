import { createAdminClient } from "@/lib/supabase/admin";

const FOLLOWUP_OVERDUE_DAYS = 7;
const COMMISSION_EXPIRING_DAYS = 7;

interface DailyBrief {
  hasContent: boolean;
  text: string;
}

function ymdInTaipei(d: Date): string {
  // Taipei = UTC+8. Use Intl to be DST-safe (even though TW has no DST).
  return new Intl.DateTimeFormat("zh-Hant-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .format(d)
    .replace(/\//g, "-");
}

/**
 * Build the daily morning brief for one LeadFlow user, sourced from
 * clients / properties / reminders they own. Returns text suitable for
 * a single LINE Push Message.
 */
export async function buildDailyBrief(ownerUserId: string): Promise<DailyBrief> {
  const admin = createAdminClient();
  const now = new Date();
  const overdueCutoff = new Date(
    now.getTime() - FOLLOWUP_OVERDUE_DAYS * 86400_000,
  ).toISOString();
  const expiringCutoff = new Date(
    now.getTime() + COMMISSION_EXPIRING_DAYS * 86400_000,
  )
    .toISOString()
    .slice(0, 10);

  const todayTaipei = ymdInTaipei(now);
  const todayStart = new Date(`${todayTaipei}T00:00:00+08:00`).toISOString();
  const todayEnd = new Date(`${todayTaipei}T23:59:59+08:00`).toISOString();

  const [followupRes, expiringRes, showingsRes] = await Promise.all([
    admin
      .from("clients")
      .select("id, name, last_contact_at, status")
      .eq("assigned_to", ownerUserId)
      .not("status", "in", "(成交,流失)")
      .lte("last_contact_at", overdueCutoff)
      .order("last_contact_at", { ascending: true })
      .limit(5),
    admin
      .from("properties")
      .select("id, title, commission_deadline, status")
      .eq("owner_id", ownerUserId)
      .not("status", "in", "(成交,解除委託)")
      .gte("commission_deadline", todayTaipei)
      .lte("commission_deadline", expiringCutoff)
      .order("commission_deadline", { ascending: true })
      .limit(5),
    admin
      .from("reminders")
      .select("id, title, remind_at, type")
      .eq("created_by", ownerUserId)
      .eq("is_done", false)
      .gte("remind_at", todayStart)
      .lte("remind_at", todayEnd)
      .order("remind_at", { ascending: true })
      .limit(5),
  ]);

  const followups = followupRes.data ?? [];
  const expiring = expiringRes.data ?? [];
  const showings = showingsRes.data ?? [];

  const totalCount = followups.length + expiring.length + showings.length;
  if (totalCount === 0) {
    return {
      hasContent: false,
      text: `☀️ 早安！今天沒有特別需要注意的事，繼續加油 💪`,
    };
  }

  const sections: string[] = [`☀️ 早安！今天有 ${totalCount} 件事要注意：`];

  if (followups.length > 0) {
    sections.push("");
    sections.push(`📌 需要跟進的客戶（${followups.length}）`);
    for (const c of followups) {
      const days = Math.floor(
        (now.getTime() - new Date(c.last_contact_at as string).getTime()) /
          86400_000,
      );
      sections.push(`• ${c.name} — 上次聯絡 ${days} 天前`);
    }
  }

  if (expiring.length > 0) {
    sections.push("");
    sections.push(`⏰ 即將到期的委託（${expiring.length}）`);
    for (const p of expiring) {
      const days = Math.floor(
        (new Date(p.commission_deadline as string).getTime() - now.getTime()) /
          86400_000,
      );
      const tail = days <= 0 ? "今天到期" : `${days} 天後到期`;
      sections.push(`• ${p.title} — ${tail}`);
    }
  }

  if (showings.length > 0) {
    sections.push("");
    sections.push(`📅 今天的提醒（${showings.length}）`);
    for (const r of showings) {
      const t = new Date(r.remind_at as string);
      const hhmm = new Intl.DateTimeFormat("zh-Hant-TW", {
        timeZone: "Asia/Taipei",
        hour: "2-digit",
        minute: "2-digit",
      }).format(t);
      sections.push(`• ${hhmm} ${r.title}`);
    }
  }

  sections.push("");
  sections.push("打開 LeadFlow 看詳細：https://taiwan-realty-crm.vercel.app/app");

  return { hasContent: true, text: sections.join("\n") };
}
