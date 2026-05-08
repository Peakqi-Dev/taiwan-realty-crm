import { NextResponse } from "next/server";
import { mockProperties } from "@/lib/mock-data";

// MVP: 直接回傳 mock data,等串接 Supabase 後改寫此 handler。
// 目前頁面是用 zustand store(client side)讀取資料,
// 此 route 僅作為前後端契約預留與外部整合(LINE bot 等)用。

export async function GET() {
  return NextResponse.json({ data: mockProperties });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  return NextResponse.json(
    { ok: true, message: "尚未串接資料庫", received: body },
    { status: 501 },
  );
}
