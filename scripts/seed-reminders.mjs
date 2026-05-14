// Seed mock reminders into Supabase, mapping the old mock target IDs
// ("p-002", "c-001", ...) to the real UUIDs of the seeded properties/clients
// by matching on title/name. Idempotent.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.argv[2] || 'dev-test@nivora.local';

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: usersList } = await admin.auth.admin.listUsers();
const owner = usersList.users.find((u) => u.email === OWNER_EMAIL);
if (!owner) { console.error(`User not found: ${OWNER_EMAIL}`); process.exit(2); }
console.log('owner:', owner.id, owner.email);

const { count } = await admin.from('reminders').select('*', { count: 'exact', head: true }).eq('created_by', owner.id);
if (count && count > 0) {
  console.log(`already seeded: ${count} reminders exist for owner. Skipping.`);
  process.exit(0);
}

// Resolve old mock IDs → new UUIDs by looking up the seeded rows.
const propByTitle = {
  'p-001': '大安森林公園旁 三房兩廳',
  'p-002': '信義計畫區 高樓層景觀豪邸',
  'p-006': '大安老公寓低總價投資物件',
};
const clientByName = {
  'c-001': '王俊傑',
  'c-006': '吳怡君',
};

const { data: props } = await admin.from('properties').select('id, title').eq('owner_id', owner.id);
const { data: clients } = await admin.from('clients').select('id, name').eq('assigned_to', owner.id);

const resolveTarget = (oldId) => {
  if (!oldId) return null;
  if (oldId in propByTitle) return props.find((p) => p.title === propByTitle[oldId])?.id ?? null;
  if (oldId in clientByName) return clients.find((c) => c.name === clientByName[oldId])?.id ?? null;
  return null;
};

const now = new Date();
const day = (offset) => { const d = new Date(now); d.setDate(d.getDate() + offset); return d; };
const hour = (offset) => { const d = new Date(now); d.setHours(d.getHours() + offset); return d; };

const rows = [
  { type: '委託到期', title: '信義計畫區 高樓層景觀豪邸 委託到期', target_old: 'p-002', remind_at: day(6),   is_done: false },
  { type: '追蹤客戶', title: '聯繫王俊傑確認週末帶看時段',          target_old: 'c-001', remind_at: day(0),   is_done: false },
  { type: '帶看行程', title: '下午 3 點 林詩涵 帶看 大安森林公園案', target_old: 'p-001', remind_at: hour(3),  is_done: false },
  { type: '追蹤客戶', title: '回覆吳怡君投資型物件清單',             target_old: 'c-006', remind_at: day(0),   is_done: false },
  { type: '委託到期', title: '大安老公寓物件已過期，需與屋主結案',   target_old: 'p-006', remind_at: day(-3),  is_done: true  },
  { type: '自訂',     title: '整理本月帶看紀錄並回報主管',           target_old: null,    remind_at: day(2),   is_done: false },
].map((r) => ({
  type: r.type,
  title: r.title,
  target_id: resolveTarget(r.target_old),
  remind_at: r.remind_at.toISOString(),
  is_done: r.is_done,
  created_by: owner.id,
}));

const { data, error } = await admin.from('reminders').insert(rows).select('id, title, target_id');
if (error) { console.error('insert failed:', error); process.exit(3); }
console.log(`inserted ${data.length} reminders`);
data.forEach((r) => console.log(`  ${r.id.slice(0, 8)}  target=${r.target_id ? r.target_id.slice(0, 8) : 'null'}  ${r.title}`));
