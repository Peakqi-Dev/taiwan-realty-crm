import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // iOS rounds the corners itself — use a solid square with a small inset.
          background:
            "linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #ec4899 100%)",
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 104,
            fontWeight: 800,
            letterSpacing: -4,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          L
        </div>
      </div>
    ),
    { ...size },
  );
}
