// Smoke test for the MiniMax client-draft parser using a direct fetch call
// (mirrors the production prompt). Run with:
//   node --env-file=.env.local scripts/test-minimax-parse.mjs

const URL = process.env.MINIMAX_BASE_URL || 'https://api.minimax.io/v1';
const KEY = process.env.MINIMAX_API_KEY;
const MODEL = process.env.MINIMAX_MODEL || 'MiniMax-M2.7';

if (!KEY) { console.error('MINIMAX_API_KEY missing'); process.exit(1); }

const SYSTEM = `你是房仲業務助手 LeadFlow，幫房仲把口語化的客戶資訊轉成結構化資料。

規則：
- 金額單位是「萬元」。例：「3000 萬」→ 3000；「1.2 億」→ 12000；「3000-3500 萬」→ budget_min=3000, budget_max=3500。
- 找不到的欄位放 null（陣列放 []）。不要硬猜。
- districts 用台北市/新北市標準行政區名（信義區、大安區、中山區...）。
- type 從固定四個值選一個：「買方」「賣方」「租客」「房東」；推斷不出來就 null。
- 一律回 JSON 物件，不要任何解釋文字、不要 markdown fence。

JSON schema：
{
  "name": string | null,
  "phone": string | null,
  "line_id": string | null,
  "type": "買方" | "賣方" | "租客" | "房東" | null,
  "budget_min": number | null,
  "budget_max": number | null,
  "districts": string[],
  "room_type": string | null,
  "notes": string
}`;

const cases = [
  '王先生 3000萬 信義區 三房',
  '林小姐想找大安區或中山區的兩房，預算 2500-3000 萬，0912-345-678',
  '陳建宏 0933-555-666 要賣信義區房子，希望 5800 萬以上成交',
  '張小姐租客 套房 月租 25-40 預算 松山區或中山區',
];

for (const c of cases) {
  console.log('--- input ---');
  console.log(c);
  const t0 = Date.now();
  const res = await fetch(`${URL}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${KEY}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: `房仲傳來的客戶資訊：\n\n${c}\n\n直接回 JSON 物件，不要任何說明、不要 <think> 標籤。` },
      ],
      temperature: 0.1,
      max_tokens: 400,
    }),
  });
  console.log(`HTTP ${res.status}  ${Date.now() - t0}ms`);
  if (!res.ok) {
    console.log('  body:', (await res.text()).slice(0, 200));
    continue;
  }
  const body = await res.json();
  const text = body.choices?.[0]?.message?.content ?? '(no content)';
  console.log('  content:', text);
  console.log();
}
