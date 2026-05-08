import { NextResponse } from "next/server";
import { mockReminders } from "@/lib/mock-data";

export async function GET() {
  return NextResponse.json({ data: mockReminders });
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  return NextResponse.json(
    { ok: true, message: "尚未串接資料庫", received: body },
    { status: 501 },
  );
}
