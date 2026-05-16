import { ImageResponse } from "next/og";
import { NextResponse } from "next/server";

export const runtime = "edge";

/**
 * Server-rendered placeholder Rich Menu image (PNG) at LINE's recommended
 * 2500×1686 size. Used as a stop-gap until real artwork ships. The
 * scripts/setup-rich-menus.mjs CLI can fetch from this endpoint to upload
 * straight to LINE.
 *
 * GET /api/richmenu/agent     → 6-tile agent menu
 * GET /api/richmenu/customer  → 6-tile customer menu
 */
const TILE_W = 833;
const TILE_H = 843;
// Right column gets 1px extra to fill 2500px total.

interface Tile {
  emoji: string;
  label: string;
  bg: string;
  fg: string;
}

const AGENT_TILES: Tile[] = [
  { emoji: "👤", label: "新增客戶", bg: "#0F172A", fg: "#F8FAFC" },
  { emoji: "📋", label: "今日任務", bg: "#1E293B", fg: "#F8FAFC" },
  { emoji: "📊", label: "打開助手", bg: "#0F172A", fg: "#F8FAFC" },
  { emoji: "💡", label: "使用教學", bg: "#1E293B", fg: "#F8FAFC" },
  { emoji: "💬", label: "意見回饋", bg: "#0F172A", fg: "#F8FAFC" },
  { emoji: "📱", label: "我的 QR", bg: "#1E293B", fg: "#F8FAFC" },
];

const CUSTOMER_TILES: Tile[] = [
  { emoji: "🏠", label: "查看物件", bg: "#06C755", fg: "#FFFFFF" },
  { emoji: "📝", label: "留下需求", bg: "#059B45", fg: "#FFFFFF" },
  { emoji: "📞", label: "聯絡業務", bg: "#06C755", fg: "#FFFFFF" },
  { emoji: "📅", label: "預約看屋", bg: "#059B45", fg: "#FFFFFF" },
  { emoji: "❓", label: "常見問題", bg: "#06C755", fg: "#FFFFFF" },
  { emoji: "💬", label: "意見回饋", bg: "#059B45", fg: "#FFFFFF" },
];

export async function GET(
  _request: Request,
  { params }: { params: { role: string } },
) {
  const role = params.role;
  let tiles: Tile[];
  if (role === "agent") tiles = AGENT_TILES;
  else if (role === "customer") tiles = CUSTOMER_TILES;
  else return NextResponse.json({ error: "unknown_role" }, { status: 404 });

  return new ImageResponse(
    (
      <div
        style={{
          width: 2500,
          height: 1686,
          display: "flex",
          flexWrap: "wrap",
          background: "#000",
        }}
      >
        {tiles.map((t, i) => {
          const col = i % 3;
          const widthAdj = col === 2 ? TILE_W + 1 : TILE_W;
          return (
            <div
              key={i}
              style={{
                width: widthAdj,
                height: TILE_H,
                background: t.bg,
                color: t.fg,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 24,
                fontFamily: "sans-serif",
                borderRight: col < 2 ? "2px solid rgba(255,255,255,0.08)" : "none",
                borderBottom:
                  i < 3 ? "2px solid rgba(255,255,255,0.08)" : "none",
              }}
            >
              <div style={{ fontSize: 220 }}>{t.emoji}</div>
              <div style={{ fontSize: 78, fontWeight: 700, letterSpacing: 4 }}>
                {t.label}
              </div>
            </div>
          );
        })}
      </div>
    ),
    { width: 2500, height: 1686 },
  );
}
