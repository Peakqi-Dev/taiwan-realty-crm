// Seed mock clients into Supabase, owned by the dev-test user.
// Mirrors scripts/seed-properties.mjs. Idempotent.

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OWNER_EMAIL = process.argv[2] || 'dev-test@nivora.local';

if (!URL || !SERVICE) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const { data: usersList, error: usersErr } = await admin.auth.admin.listUsers();
if (usersErr) throw usersErr;
const owner = usersList.users.find((u) => u.email === OWNER_EMAIL);
if (!owner) { console.error(`User not found: ${OWNER_EMAIL}`); process.exit(2); }
console.log('owner:', owner.id, owner.email);

const { count } = await admin.from('clients').select('*', { count: 'exact', head: true }).eq('assigned_to', owner.id);
if (count && count > 0) {
  console.log(`already seeded: ${count} clients exist for owner. Skipping.`);
  process.exit(0);
}

const now = new Date();
const day = (offset) => { const d = new Date(now); d.setDate(d.getDate() + offset); return d; };
const hour = (offset) => { const d = new Date(now); d.setHours(d.getHours() + offset); return d; };

const rows = [
  { name: '王俊傑', phone: '0912-111-222', line_id: 'junjie_w', type: '買方', status: '追蹤中', budget_min: 2000, budget_max: 3000, preferred_districts: ['中山區', '松山區'], requirements: '首購、雙北捷運站 5 分鐘內、2 房以上', last_contact_at: hour(-6), created_at: day(-20) },
  { name: '林詩涵', phone: '0922-333-444', line_id: 'shihan_l', type: '買方', status: '帶看', budget_min: 4000, budget_max: 5500, preferred_districts: ['大安區', '信義區'], requirements: '三房、坪數 30 以上、景觀優先', last_contact_at: hour(-2), created_at: day(-15) },
  { name: '陳建宏', phone: '0933-555-666', line_id: null, type: '賣方', status: '議價', budget_min: null, budget_max: null, preferred_districts: ['信義區'], requirements: '希望 5800 萬以上成交，可調整裝潢價', last_contact_at: day(-1), created_at: day(-40) },
  { name: '黃美玲', phone: '0955-777-888', line_id: 'meiling.h', type: '房東', status: '成交', budget_min: null, budget_max: null, preferred_districts: ['松山區'], requirements: '短租客為主，租金 35,000 起', last_contact_at: day(-3), created_at: day(-50) },
  { name: '張育銘', phone: '0966-999-000', line_id: null, type: '租客', status: '新客戶', budget_min: 25, budget_max: 40, preferred_districts: ['松山區', '中山區'], requirements: '套房、可短租 6 個月、近捷運', last_contact_at: hour(-12), created_at: day(-1) },
  { name: '吳怡君', phone: '0911-222-333', line_id: 'yijun_wu', type: '買方', status: '新客戶', budget_min: 1500, budget_max: 2200, preferred_districts: ['中山區', '內湖區'], requirements: '投資型物件、屋齡 30 年內可接受', last_contact_at: hour(-20), created_at: day(-2) },
  { name: '蔡明哲', phone: '0988-444-555', line_id: null, type: '賣方', status: '流失', budget_min: null, budget_max: null, preferred_districts: ['大安區'], requirements: '屋主已轉委託他家。', last_contact_at: day(-30), created_at: day(-90) },
  { name: '李玉芬', phone: '0977-666-777', line_id: 'yufen.lee', type: '買方', status: '追蹤中', budget_min: 3500, budget_max: 4500, preferred_districts: ['大安區', '中山區'], requirements: '屋齡 15 年內、三房、需含車位', last_contact_at: hour(-1), created_at: day(-10) },
].map((r) => ({
  ...r,
  last_contact_at: r.last_contact_at.toISOString(),
  created_at: r.created_at.toISOString(),
  assigned_to: owner.id,
}));

const { data, error } = await admin.from('clients').insert(rows).select('id, name');
if (error) { console.error('insert failed:', error); process.exit(3); }
console.log(`inserted ${data.length} clients`);
data.forEach((c) => console.log(`  ${c.id.slice(0, 8)}  ${c.name}`));
