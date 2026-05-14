// Seed mock interactions into Supabase, mapping old mock IDs to real UUIDs
// by matching property titles and client names. Idempotent.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.argv[2] || 'dev-test@nivora.local';

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: usersList } = await admin.auth.admin.listUsers();
const owner = usersList.users.find((u) => u.email === OWNER_EMAIL);
if (!owner) { console.error(`User not found: ${OWNER_EMAIL}`); process.exit(2); }
console.log('owner:', owner.id, owner.email);

const { count } = await admin.from('interactions').select('*', { count: 'exact', head: true }).eq('created_by', owner.id);
if (count && count > 0) {
  console.log(`already seeded: ${count} interactions exist. Skipping.`);
  process.exit(0);
}

// Map old mock ids → seeded titles/names
const propByOld = {
  'p-001': '大安森林公園旁 三房兩廳',
  'p-002': '信義計畫區 高樓層景觀豪邸',
};
const clientByOld = {
  'c-001': '王俊傑',
  'c-002': '林詩涵',
  'c-003': '陳建宏',
  'c-005': '張育銘',
  'c-008': '李玉芬',
};

const { data: props } = await admin.from('properties').select('id, title').eq('owner_id', owner.id);
const { data: clients } = await admin.from('clients').select('id, name').eq('assigned_to', owner.id);

const findClient = (oldId) => clients.find((c) => c.name === clientByOld[oldId])?.id;
const findProperty = (oldId) => props.find((p) => p.title === propByOld[oldId])?.id;

const hour = (offset) => new Date(Date.now() + offset * 3600e3);
const day = (offset) => new Date(Date.now() + offset * 86400e3);

const mock = [
  { clientOld: 'c-002', propertyOld: 'p-001', type: '帶看', note: '客戶對採光與格局滿意，擔心管理費略高。', created_at: hour(-2) },
  { clientOld: 'c-001', propertyOld: null,    type: '電話', note: '更新近期捷運站旁 2-3 房新案，客戶要求週末再帶看一次。', created_at: hour(-6) },
  { clientOld: 'c-008', propertyOld: null,    type: 'LINE', note: '提供大安區三房物件清單，客戶請假後回覆。', created_at: hour(-1) },
  { clientOld: 'c-003', propertyOld: 'p-002', type: '電話', note: '屋主希望加價 80 萬，需與買方再溝通。', created_at: day(-1) },
  { clientOld: 'c-005', propertyOld: null,    type: 'LINE', note: '新客戶初次接觸，提供租賃需求表。', created_at: hour(-12) },
];

const rows = mock.map((m) => {
  const client_id = findClient(m.clientOld);
  if (!client_id) {
    console.error(`Client not found for ${m.clientOld}; skipping`);
    return null;
  }
  return {
    client_id,
    property_id: m.propertyOld ? findProperty(m.propertyOld) ?? null : null,
    type: m.type,
    note: m.note,
    created_by: owner.id,
    created_at: m.created_at.toISOString(),
  };
}).filter(Boolean);

const { data, error } = await admin.from('interactions').insert(rows).select('id, type, note');
if (error) { console.error('insert failed:', error); process.exit(3); }
console.log(`inserted ${data.length} interactions`);
data.forEach((i) => console.log(`  ${i.id.slice(0, 8)}  [${i.type}]  ${i.note.slice(0, 30)}...`));
