import { ImageResponse } from "next/og";

export const size = { width: 192, height: 192 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background:
            "linear-gradient(135deg, #3b82f6 0%, #a855f7 50%, #ec4899 100%)",
          borderRadius: 38,
        }}
      >
        <div
          style={{
            color: "white",
            fontSize: 110,
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
