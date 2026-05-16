import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/* eslint-disable @typescript-eslint/no-explicit-any */

export interface AdminOverview {
  totalUsers: number;
  betaApplications: number;
  lineBindings: number;
  usersThisWeek: number;
  clientsThisWeek: number;
  activeUsers: number; // last_sign_in_at within 7d
  profileComplete: number; // agent_profiles with all 4 fields filled
  profileCompleteRatio: number; // 0..1
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export async function getAdminOverview(): Promise<AdminOverview> {
  const admin = createAdminClient();
  const weekAgo = new Date(Date.now() - WEEK_MS).toISOString();

  // auth.users isn't queryable via the public client; we use the admin REST API.
  const { data: users } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const allUsers = users?.users ?? [];

  const [
    { count: betaCount },
    { count: bindingCount },
    { count: clientsThisWeek },
    { data: profiles },
  ] = await Promise.all([
    admin.from("beta_applications").select("*", { count: "exact", head: true }),
    admin
      .from("line_bindings")
      .select("*", { count: "exact", head: true })
      .is("unbound_at", null),
    admin
      .from("clients")
      .select("*", { count: "exact", head: true })
      .gte("created_at", weekAgo),
    admin
      .from("agent_profiles")
      .select("display_name, phone, bio, line_id"),
  ]);

  // "Complete" = display_name customized (not the auto-backfill default
  // "LeadFlow 業務") AND phone / bio / line_id all non-empty.
  const profileRows = profiles ?? [];
  const profileComplete = profileRows.filter((p: any) => {
    const dn = ((p.display_name as string) ?? "").trim();
    const ph = ((p.phone as string) ?? "").trim();
    const bio = ((p.bio as string) ?? "").trim();
    const lid = ((p.line_id as string) ?? "").trim();
    return dn && dn !== "LeadFlow 業務" && ph && bio && lid;
  }).length;
  const profileCompleteRatio =
    profileRows.length > 0 ? profileComplete / profileRows.length : 0;

  const usersThisWeek = allUsers.filter(
    (u: any) => u.created_at && new Date(u.created_at).getTime() >= Date.now() - WEEK_MS,
  ).length;
  const activeUsers = allUsers.filter(
    (u: any) =>
      u.last_sign_in_at &&
      new Date(u.last_sign_in_at).getTime() >= Date.now() - WEEK_MS,
  ).length;

  return {
    totalUsers: allUsers.length,
    betaApplications: betaCount ?? 0,
    lineBindings: bindingCount ?? 0,
    usersThisWeek,
    clientsThisWeek: clientsThisWeek ?? 0,
    activeUsers,
    profileComplete,
    profileCompleteRatio,
  };
}

export interface AdminUserRow {
  id: string;
  email: string;
  displayName: string | null;
  createdAt: string;
  lastSignInAt: string | null;
  phone: string | null;
  lineUserId: string | null;
  lineBoundAt: string | null;
}

export async function listAdminUsers(search?: string): Promise<AdminUserRow[]> {
  const admin = createAdminClient();

  const { data } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const users = data?.users ?? [];

  const [betaApps, bindings] = await Promise.all([
    admin.from("beta_applications").select("email, phone"),
    admin.from("line_bindings").select("user_id, line_user_id, bound_at, unbound_at"),
  ]);

  const phoneByEmail = new Map<string, string>();
  for (const b of betaApps.data ?? []) {
    if (b.email && b.phone) phoneByEmail.set(b.email as string, b.phone as string);
  }
  const bindingByUser = new Map<string, { line_user_id: string; bound_at: string; unbound_at: string | null }>();
  for (const b of bindings.data ?? []) {
    bindingByUser.set(b.user_id as string, {
      line_user_id: b.line_user_id as string,
      bound_at: b.bound_at as string,
      unbound_at: (b.unbound_at as string) ?? null,
    });
  }

  let rows: AdminUserRow[] = users.map((u: any) => ({
    id: u.id,
    email: u.email ?? "",
    displayName:
      (u.user_metadata?.display_name as string | undefined) ?? null,
    createdAt: u.created_at ?? "",
    lastSignInAt: u.last_sign_in_at ?? null,
    phone: phoneByEmail.get(u.email ?? "") ?? null,
    lineUserId:
      bindingByUser.get(u.id)?.unbound_at === null
        ? bindingByUser.get(u.id)?.line_user_id ?? null
        : null,
    lineBoundAt: bindingByUser.get(u.id)?.bound_at ?? null,
  }));

  if (search) {
    const s = search.toLowerCase();
    rows = rows.filter(
      (r) =>
        r.email.toLowerCase().includes(s) ||
        (r.displayName ?? "").toLowerCase().includes(s),
    );
  }

  rows.sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  return rows;
}

export interface AdminUserDetail extends AdminUserRow {
  clientCount: number;
  propertyCount: number;
  reminderCount: number;
  agentProfile: {
    shortCode: string;
    displayName: string;
    phone: string;
    bio: string;
    photoUrl: string | null;
    lineId: string;
  } | null;
  betaApplication: {
    name: string | null;
    agency: string | null;
    monthlyClients: string | null;
    appliedAt: string;
  } | null;
}

export async function getAdminUserDetail(
  userId: string,
): Promise<AdminUserDetail | null> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error || !data?.user) return null;
  const u: any = data.user;

  const [
    { count: clientCount },
    { count: propertyCount },
    { count: reminderCount },
    { data: binding },
    { data: beta },
    { data: profile },
  ] = await Promise.all([
    admin
      .from("clients")
      .select("*", { count: "exact", head: true })
      .eq("assigned_to", userId),
    admin
      .from("properties")
      .select("*", { count: "exact", head: true })
      .eq("owner_id", userId),
    admin
      .from("reminders")
      .select("*", { count: "exact", head: true })
      .eq("created_by", userId),
    admin
      .from("line_bindings")
      .select("line_user_id, bound_at, unbound_at")
      .eq("user_id", userId)
      .maybeSingle(),
    admin
      .from("beta_applications")
      .select("name, agency, monthly_clients, applied_at, phone")
      .eq("email", u.email ?? "")
      .order("applied_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin
      .from("agent_profiles")
      .select("short_code, display_name, phone, bio, photo_url, line_id")
      .eq("user_id", userId)
      .maybeSingle(),
  ]);

  return {
    id: u.id,
    email: u.email ?? "",
    displayName: (u.user_metadata?.display_name as string | undefined) ?? null,
    createdAt: u.created_at ?? "",
    lastSignInAt: u.last_sign_in_at ?? null,
    phone: (beta as any)?.phone ?? null,
    lineUserId:
      binding && !binding.unbound_at ? (binding.line_user_id as string) : null,
    lineBoundAt: (binding?.bound_at as string) ?? null,
    clientCount: clientCount ?? 0,
    propertyCount: propertyCount ?? 0,
    reminderCount: reminderCount ?? 0,
    agentProfile: profile
      ? {
          shortCode: (profile as any).short_code ?? "",
          displayName: (profile as any).display_name ?? "",
          phone: (profile as any).phone ?? "",
          bio: (profile as any).bio ?? "",
          photoUrl: ((profile as any).photo_url as string | null) ?? null,
          lineId: (profile as any).line_id ?? "",
        }
      : null,
    betaApplication: beta
      ? {
          name: (beta as any).name ?? null,
          agency: (beta as any).agency ?? null,
          monthlyClients: (beta as any).monthly_clients ?? null,
          appliedAt: (beta as any).applied_at ?? "",
        }
      : null,
  };
}

export interface AdminBetaRow {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  lineId: string | null;
  agency: string | null;
  monthlyClients: string | null;
  appliedAt: string;
  status: "已開通" | "待審";
}

export async function listBetaApplications(): Promise<AdminBetaRow[]> {
  const admin = createAdminClient();
  const [apps, users] = await Promise.all([
    admin.from("beta_applications").select("*").order("applied_at", { ascending: false }),
    admin.auth.admin.listUsers({ perPage: 1000 }),
  ]);

  const emailsWithAccount = new Set(
    (users.data?.users ?? []).map((u: any) => u.email).filter(Boolean),
  );

  return (apps.data ?? []).map((a: any) => ({
    id: a.id,
    email: a.email,
    name: a.name,
    phone: a.phone ?? null,
    lineId: a.line_id ?? null,
    agency: a.agency ?? null,
    monthlyClients: a.monthly_clients ?? null,
    appliedAt: a.applied_at ?? "",
    status: emailsWithAccount.has(a.email) ? "已開通" : "待審",
  }));
}
