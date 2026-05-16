// One-time setup: register the agent + customer Rich Menus on LINE and
// upload their images. Idempotent-ish — re-running creates new Rich Menus
// (LINE has no upsert); pass --delete <id> to remove an old one.
//
// Usage:
//   node --env-file=.env.local scripts/setup-rich-menus.mjs <command>
//
// Commands:
//   create-agent <image-path>     register agent menu + upload image
//   create-customer <image-path>  register customer menu + upload image
//   create-from-prod <role>       fetch placeholder PNG from
//                                 https://taiwan-realty-crm.vercel.app/api/richmenu/<role>
//                                 and register it (role = agent | customer)
//   list                          show all registered Rich Menus
//   delete <richMenuId>           remove a menu by id
//
// After create-*, print the richMenuId. Set it as
// LINE_RICH_MENU_AGENT_ID / LINE_RICH_MENU_CUSTOMER_ID on Vercel, redeploy.

import { readFileSync } from 'node:fs';

const TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;
if (!TOKEN) {
  console.error('missing LINE_CHANNEL_ACCESS_TOKEN');
  process.exit(1);
}

const API = 'https://api.line.me/v2/bot';
const DATA_API = 'https://api-data.line.me/v2/bot';

// 6-tile 2500x1686 layout: 3 columns × 2 rows. Each cell ~833x843.
function sixTileAreas(actions) {
  const W = 833;
  const H = 843;
  return [0, 1, 2, 3, 4, 5].map((i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const x = col * W + (col === 2 ? 1 : 0); // keep right edge inside 2500
    return {
      bounds: { x, y: row * H, width: W, height: H },
      action: actions[i],
    };
  });
}

const AGENT_MENU = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: 'LeadFlow Agent Menu',
  chatBarText: '助手選單',
  areas: sixTileAreas([
    { type: 'message', text: '新增客戶' },
    { type: 'message', text: '今日任務' },
    {
      type: 'uri',
      uri: 'https://taiwan-realty-crm.vercel.app/app',
      label: '打開助手',
    },
    { type: 'message', text: '使用教學' },
    { type: 'message', text: '意見回饋' },
    {
      type: 'uri',
      uri: 'https://taiwan-realty-crm.vercel.app/app/qr',
      label: '我的 QR',
    },
  ]),
};

const CUSTOMER_MENU = {
  size: { width: 2500, height: 1686 },
  selected: true,
  name: 'LeadFlow Customer Menu',
  chatBarText: '服務選單',
  areas: sixTileAreas([
    { type: 'message', text: '查看物件' },
    { type: 'message', text: '留下需求' },
    { type: 'message', text: '聯絡業務' },
    { type: 'message', text: '預約看屋' },
    { type: 'message', text: '常見問題' },
    { type: 'message', text: '意見回饋' },
  ]),
};

async function createRichMenu(menu) {
  const res = await fetch(`${API}/richmenu`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify(menu),
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`createRichMenu ${res.status}: ${body}`);
  return JSON.parse(body).richMenuId;
}

async function uploadImage(richMenuId, imagePath) {
  const buf = readFileSync(imagePath);
  const contentType = imagePath.toLowerCase().endsWith('.jpg') || imagePath.toLowerCase().endsWith('.jpeg')
    ? 'image/jpeg'
    : 'image/png';
  const res = await fetch(`${DATA_API}/richmenu/${richMenuId}/content`, {
    method: 'POST',
    headers: {
      'Content-Type': contentType,
      Authorization: `Bearer ${TOKEN}`,
    },
    body: buf,
  });
  if (!res.ok) throw new Error(`uploadImage ${res.status}: ${await res.text()}`);
}

async function listMenus() {
  const res = await fetch(`${API}/richmenu/list`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`list ${res.status}: ${await res.text()}`);
  return (await res.json()).richmenus ?? [];
}

async function deleteMenu(id) {
  const res = await fetch(`${API}/richmenu/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${TOKEN}` },
  });
  if (!res.ok) throw new Error(`delete ${res.status}: ${await res.text()}`);
}

const [cmd, arg] = process.argv.slice(2);

try {
  if (cmd === 'create-agent') {
    if (!arg) throw new Error('usage: create-agent <image-path>');
    const id = await createRichMenu(AGENT_MENU);
    await uploadImage(id, arg);
    console.log(`✅ Agent rich menu ready. id=${id}`);
    console.log(`Set LINE_RICH_MENU_AGENT_ID=${id} in Vercel env.`);
  } else if (cmd === 'create-customer') {
    if (!arg) throw new Error('usage: create-customer <image-path>');
    const id = await createRichMenu(CUSTOMER_MENU);
    await uploadImage(id, arg);
    console.log(`✅ Customer rich menu ready. id=${id}`);
    console.log(`Set LINE_RICH_MENU_CUSTOMER_ID=${id} in Vercel env.`);
  } else if (cmd === 'create-from-prod') {
    const role = arg;
    if (role !== 'agent' && role !== 'customer') {
      throw new Error('usage: create-from-prod agent|customer');
    }
    const menu = role === 'agent' ? AGENT_MENU : CUSTOMER_MENU;
    const origin = process.env.APP_ORIGIN || 'https://taiwan-realty-crm.vercel.app';
    const imgRes = await fetch(`${origin}/api/richmenu/${role}`);
    if (!imgRes.ok) {
      throw new Error(`fetch placeholder PNG failed: ${imgRes.status}`);
    }
    const imgBuf = Buffer.from(await imgRes.arrayBuffer());
    const id = await createRichMenu(menu);
    // uploadImage takes a path; inline the equivalent fetch with buffer.
    const up = await fetch(`${DATA_API}/richmenu/${id}/content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'image/png',
        Authorization: `Bearer ${TOKEN}`,
      },
      body: imgBuf,
    });
    if (!up.ok) throw new Error(`upload ${up.status}: ${await up.text()}`);
    console.log(`✅ ${role} rich menu ready. id=${id}`);
    const envKey = role === 'agent'
      ? 'LINE_RICH_MENU_AGENT_ID'
      : 'LINE_RICH_MENU_CUSTOMER_ID';
    console.log(`Set ${envKey}=${id} in Vercel env, then redeploy.`);
  } else if (cmd === 'list') {
    const menus = await listMenus();
    for (const m of menus) {
      console.log(`- ${m.richMenuId}  ${m.name}  (${m.chatBarText})`);
    }
  } else if (cmd === 'delete') {
    if (!arg) throw new Error('usage: delete <richMenuId>');
    await deleteMenu(arg);
    console.log(`✅ deleted ${arg}`);
  } else {
    console.log('commands: create-agent <png> | create-customer <png> | list | delete <id>');
    process.exit(1);
  }
} catch (err) {
  console.error('❌', err.message);
  process.exit(1);
}
