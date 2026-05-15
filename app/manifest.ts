import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LeadFlow AI 業務助手",
    short_name: "LeadFlow",
    description:
      "你的 AI 房仲業務助手。一句話建檔、提醒跟進、把時間留給成交。",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    orientation: "portrait",
    lang: "zh-Hant-TW",
    icons: [
      {
        src: "/icon",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/apple-icon",
        sizes: "180x180",
        type: "image/png",
      },
    ],
    categories: ["business", "productivity"],
  };
}
