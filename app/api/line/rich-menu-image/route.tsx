import { ImageResponse } from "next/og";

export const dynamic = "force-static";
export const revalidate = false;

/**
 * LINE Rich Menu image — 2500×1686 (2x3 grid of 833×843 tiles).
 * The setup script downloads this URL and uploads bytes to LINE.
 */
const W = 2500;
const H = 1686;

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "#0f172a",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <Row>
          <Tile
            label="新增客戶"
            gradient="linear-gradient(180deg, #1e3a8a 0%, #1e293b 100%)"
            icon={<NotebookIcon />}
          />
          <Divider vertical />
          <Tile
            label="今日任務"
            gradient="linear-gradient(180deg, #6d28d9 0%, #1e293b 100%)"
            icon={<ClipboardIcon />}
          />
          <Divider vertical />
          <Tile
            label="打開助手"
            gradient="linear-gradient(180deg, #be185d 0%, #1e293b 100%)"
            icon={<ChartIcon />}
          />
        </Row>
        <Divider horizontal />
        <Row>
          <Tile
            label="使用教學"
            gradient="linear-gradient(180deg, #0e7490 0%, #1e293b 100%)"
            icon={<HelpIcon />}
          />
          <Divider vertical />
          <Tile
            label="意見回饋"
            gradient="linear-gradient(180deg, #b45309 0%, #1e293b 100%)"
            icon={<MessageIcon />}
          />
          <Divider vertical />
          <Tile
            label="我的帳號"
            gradient="linear-gradient(180deg, #4338ca 0%, #1e293b 100%)"
            icon={<SettingsIcon />}
          />
        </Row>
      </div>
    ),
    { width: W, height: H },
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return <div style={{ display: "flex", flex: 1, width: "100%" }}>{children}</div>;
}

function Divider({
  vertical = false,
  horizontal = false,
}: {
  vertical?: boolean;
  horizontal?: boolean;
}) {
  if (vertical) {
    return <div style={{ width: 4, background: "#0f172a", height: "100%" }} />;
  }
  if (horizontal) {
    return <div style={{ height: 4, background: "#0f172a", width: "100%" }} />;
  }
  return null;
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
        gap: 30,
      }}
    >
      <div
        style={{
          display: "flex",
          width: 200,
          height: 200,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 40,
          background: "rgba(255,255,255,0.08)",
        }}
      >
        {icon}
      </div>
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
}

const STROKE = "white";
const SW = 2;

function NotebookIcon() {
  return (
    <svg width="140" height="140" viewBox="0 0 24 24" fill="none">
      <rect x="4" y="3" width="16" height="18" rx="2" stroke={STROKE} strokeWidth={SW} />
      <line x1="8" y1="3" x2="8" y2="21" stroke={STROKE} strokeWidth={SW} />
      <line x1="11" y1="8" x2="17" y2="8" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <line x1="11" y1="12" x2="17" y2="12" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <line x1="11" y1="16" x2="14" y2="16" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="140" height="140" viewBox="0 0 24 24" fill="none">
      <rect x="6" y="4" width="12" height="18" rx="2" stroke={STROKE} strokeWidth={SW} />
      <rect x="9" y="2" width="6" height="4" rx="1" stroke={STROKE} strokeWidth={SW} />
      <path d="M 9 11 L 11 13 L 15 9" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" strokeLinejoin="round" />
      <line x1="9" y1="17" x2="15" y2="17" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="140" height="140" viewBox="0 0 24 24" fill="none">
      <line x1="4" y1="20" x2="20" y2="20" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <rect x="6" y="12" width="3" height="6" rx="1" stroke={STROKE} strokeWidth={SW} />
      <rect x="11" y="8" width="3" height="10" rx="1" stroke={STROKE} strokeWidth={SW} />
      <rect x="16" y="5" width="3" height="13" rx="1" stroke={STROKE} strokeWidth={SW} />
    </svg>
  );
}

function HelpIcon() {
  return (
    <svg width="140" height="140" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="9" stroke={STROKE} strokeWidth={SW} />
      <path d="M 9 9.5 A 3 3 0 1 1 12 13 L 12 14" stroke={STROKE} strokeWidth={SW} strokeLinecap="round" />
      <circle cx="12" cy="17.5" r="0.6" fill={STROKE} />
    </svg>
  );
}

function MessageIcon() {
  return (
    <svg width="140" height="140" viewBox="0 0 24 24" fill="none">
      <path
        d="M 4 5 A 1 1 0 0 1 5 4 L 19 4 A 1 1 0 0 1 20 5 L 20 16 A 1 1 0 0 1 19 17 L 10 17 L 6 21 L 6 17 L 5 17 A 1 1 0 0 1 4 16 Z"
        stroke={STROKE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
      <circle cx="9" cy="10.5" r="0.6" fill={STROKE} />
      <circle cx="12" cy="10.5" r="0.6" fill={STROKE} />
      <circle cx="15" cy="10.5" r="0.6" fill={STROKE} />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width="140" height="140" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="3" stroke={STROKE} strokeWidth={SW} />
      <path
        d="M 12 3 L 13 5 L 15.5 4.5 L 16.5 7 L 19 7.5 L 19 10 L 21 11 L 21 13 L 19 14 L 19 16.5 L 16.5 17 L 15.5 19.5 L 13 19 L 12 21 L 11 19 L 8.5 19.5 L 7.5 17 L 5 16.5 L 5 14 L 3 13 L 3 11 L 5 10 L 5 7.5 L 7.5 7 L 8.5 4.5 L 11 5 Z"
        stroke={STROKE}
        strokeWidth={SW}
        strokeLinejoin="round"
      />
    </svg>
  );
}
