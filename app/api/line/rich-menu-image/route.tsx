import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const revalidate = false;

/**
 * Renders the LINE Rich Menu image (2500×843, the "full" size). Three
 * equal-width tiles, each labelled with an emoji + Chinese text. The
 * one-shot setup script (scripts/setup-line-rich-menu.mjs) downloads
 * this URL and uploads the bytes to LINE.
 */
export async function GET() {
  const tile = (emoji: string, label: string, gradient: string) => (
    <div
      style={{
        display: "flex",
        flex: 1,
        height: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: gradient,
        gap: 24,
      }}
    >
      <div style={{ fontSize: 200 }}>{emoji}</div>
      <div
        style={{
          fontSize: 78,
          fontWeight: 800,
          color: "white",
          letterSpacing: -2,
        }}
      >
        {label}
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#0f172a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {tile("📝", "新增客戶", "linear-gradient(180deg, #1e3a8a 0%, #1e293b 100%)")}
        <div style={{ width: 4, background: "#0f172a", height: "100%" }} />
        {tile("📋", "今日任務", "linear-gradient(180deg, #6d28d9 0%, #1e293b 100%)")}
        <div style={{ width: 4, background: "#0f172a", height: "100%" }} />
        {tile("📊", "打開助手", "linear-gradient(180deg, #be185d 0%, #1e293b 100%)")}
      </div>
    ),
    {
      width: 2500,
      height: 843,
    },
  );
}
