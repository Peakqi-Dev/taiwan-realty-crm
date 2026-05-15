// One-shot script: creates the LeadFlow LINE Rich Menu, uploads the
// image rendered at /api/line/rich-menu-image, and sets it as the
// default menu for all users.
//
// Run with:
//   node --env-file=.env.local scripts/setup-line-rich-menu.mjs
//
// Required env: LINE_CHANNEL_ACCESS_TOKEN, LINE_LIFF_URL
// Optional: PUBLIC_BASE_URL (defaults to https://taiwan-realty-crm.vercel.app)

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
const LIFF_URL = process.env.LINE_LIFF_URL;
const BASE = process.env.PUBLIC_BASE_URL || "https://taiwan-realty-crm.vercel.app";

if (!TOKEN || !LIFF_URL) {
  console.error("Missing LINE_CHANNEL_ACCESS_TOKEN or LINE_LIFF_URL");
  process.exit(1);
}

const TILE_W = Math.floor(2500 / 3); // ~833
const HEIGHT = 843;

const richMenu = {
  size: { width: 2500, height: HEIGHT },
  selected: true,
  name: "LeadFlow main",
  chatBarText: "選單",
  areas: [
    {
      bounds: { x: 0, y: 0, width: TILE_W, height: HEIGHT },
      action: { type: "message", text: "新增客戶" },
    },
    {
      bounds: { x: TILE_W, y: 0, width: TILE_W, height: HEIGHT },
      action: { type: "message", text: "今日任務" },
    },
    {
      bounds: {
        x: TILE_W * 2,
        y: 0,
        width: 2500 - TILE_W * 2,
        height: HEIGHT,
      },
      action: { type: "uri", label: "打開助手", uri: LIFF_URL },
    },
  ],
};

const headers = { Authorization: `Bearer ${TOKEN}` };

// Optional: delete previous default + any "LeadFlow main" menus so this is idempotent.
console.log("→ listing existing rich menus");
const list = await fetch("https://api.line.me/v2/bot/richmenu/list", { headers });
if (list.ok) {
  const body = await list.json();
  for (const m of body.richmenus ?? []) {
    if (m.name === "LeadFlow main") {
      console.log(`  removing old menu ${m.richMenuId}`);
      await fetch(`https://api.line.me/v2/bot/richmenu/${m.richMenuId}`, {
        method: "DELETE",
        headers,
      });
    }
  }
} else {
  console.warn("  list failed:", list.status);
}

// 1. Create rich menu config
console.log("→ creating rich menu config");
const create = await fetch("https://api.line.me/v2/bot/richmenu", {
  method: "POST",
  headers: { ...headers, "Content-Type": "application/json" },
  body: JSON.stringify(richMenu),
});
if (!create.ok) {
  console.error("create failed:", create.status, await create.text());
  process.exit(2);
}
const { richMenuId } = await create.json();
console.log("  richMenuId =", richMenuId);

// 2. Fetch the image from our public endpoint
console.log("→ fetching image from", `${BASE}/api/line/rich-menu-image`);
const imgRes = await fetch(`${BASE}/api/line/rich-menu-image`);
if (!imgRes.ok) {
  console.error("image fetch failed:", imgRes.status);
  process.exit(3);
}
const imgBuf = Buffer.from(await imgRes.arrayBuffer());
console.log(`  image: ${imgBuf.length} bytes, content-type=${imgRes.headers.get("content-type")}`);

// 3. Upload image bytes — note the dedicated upload host
console.log("→ uploading image");
const up = await fetch(
  `https://api-data.line.me/v2/bot/richmenu/${richMenuId}/content`,
  {
    method: "POST",
    headers: { ...headers, "Content-Type": "image/png" },
    body: imgBuf,
  },
);
if (!up.ok) {
  console.error("upload failed:", up.status, await up.text());
  process.exit(4);
}
console.log("  uploaded ✓");

// 4. Set as default for all users
console.log("→ setting as default");
const setDefault = await fetch(
  `https://api.line.me/v2/bot/user/all/richmenu/${richMenuId}`,
  { method: "POST", headers },
);
if (!setDefault.ok) {
  console.error("set default failed:", setDefault.status, await setDefault.text());
  process.exit(5);
}

console.log("\n✅ Rich menu live. ID:", richMenuId);
console.log("  Open LINE → conversation with the bot → menu should appear at the bottom.");
