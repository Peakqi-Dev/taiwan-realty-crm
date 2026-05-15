import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const revalidate = false;

/**
 * Renders the LINE Rich Menu image (2500×843). Three equal tiles with an
 * inline SVG icon (lucide-style strokes) + label. The setup script
 * downloads this URL and uploads the bytes to LINE.
 */
export async function GET() {
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
        <Tile
          label="新增客戶"
          gradient="linear-gradient(180deg, #1e3a8a 0%, #1e293b 100%)"
          icon={<NotebookIcon />}
        />
        <div style={{ width: 4, background: "#0f172a", height: "100%" }} />
        <Tile
          label="今日任務"
          gradient="linear-gradient(180deg, #6d28d9 0%, #1e293b 100%)"
          icon={<ClipboardIcon />}
        />
        <div style={{ width: 4, background: "#0f172a", height: "100%" }} />
        <Tile
          label="打開助手"
          gradient="linear-gradient(180deg, #be185d 0%, #1e293b 100%)"
          icon={<ChartIcon />}
        />
      </div>
    ),
    { width: 2500, height: 843 },
  );
}

function Tile({
  label,
  gradient,
  icon,
}: {
  label: string;
  gradient: string;
  icon: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flex: 1,
        height: "100%",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: gradient,
        gap: 36,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 220,
          height: 220,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 44,
          background: "rgba(255,255,255,0.08)",
        }}
      >
        {icon}
      </div>
      <div
        style={{
          fontSize: 82,
          fontWeight: 800,
          color: "white",
          letterSpacing: -2,
        }}
      >
        {label}
      </div>
    </div>
  );
}

const STROKE = "white";
const SW = 10;

function NotebookIcon() {
  return (
    <svg width="160" height="160" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={STROKE} strokeWidth={SW / 5} />
      <line x1="8" y1="3" x2="8" y2="21" stroke={STROKE} strokeWidth={SW / 5} />
      <line x1="11" y1="8" x2="17" y2="8" stroke={STROKE} strokeWidth={SW / 5} strokeLinecap="round" />
      <line x1="11" y1="12" x2="17" y2="12" stroke={STROKE} strokeWidth={SW / 5} strokeLinecap="round" />
      <line x1="11" y1="16" x2="14" y2="16" stroke={STROKE} strokeWidth={SW / 5} strokeLinecap="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="160" height="160" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="12" height="18" rx="2" stroke={STROKE} strokeWidth={SW / 5} />
      <rect x="9" y="2" width="6" height="4" rx="1" stroke={STROKE} strokeWidth={SW / 5} />
      <path d="M 9 11 L 11 13 L 15 9" stroke={STROKE} strokeWidth={SW / 5} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="17" x2="15" y2="17" stroke={STROKE} strokeWidth={SW / 5} strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="160" height="160" viewBox="0 0 24 24" fill="none">
      <line x1="4" y1="20" x2="20" y2="20" stroke={STROKE} strokeWidth={SW / 5} strokeLinecap="round" />
      <rect x="6" y="12" width="3" height="6" rx="1" stroke={STROKE} strokeWidth={SW / 5} />
      <rect x="11" y="8" width="3" height="10" rx="1" stroke={STROKE} strokeWidth={SW / 5} />
      <rect x="16" y="5" width="3" height="13" rx="1" stroke={STROKE} strokeWidth={SW / 5} />
    </svg>
  );
}
