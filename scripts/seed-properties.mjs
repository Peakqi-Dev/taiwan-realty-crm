// Seed mock properties into Supabase, owned by the dev-test user.
// Uses the service role key to bypass RLS. Idempotent: skips if any row exists for the user.

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
if (!owner) {
  console.error(`User not found: ${OWNER_EMAIL}`);
  process.exit(2);
}
console.log('owner:', owner.id, owner.email);

const { count } = await admin.from('properties').select('*', { count: 'exact', head: true }).eq('owner_id', owner.id);
if (count && count > 0) {
  console.log(`already seeded: ${count} properties exist for owner. Skipping.`);
  process.exit(0);
}

const now = new Date();
const day = (offset) => {
  const d = new Date(now);
  d.setDate(d.getDate() + offset);
  return d;
};

const rows = [
  { title: '大安森林公園旁 三房兩廳', address: '台北市大安區新生南路二段 30 號 8 樓', district: '大安區', price: 4280, type: '買賣', rooms: 3, bathrooms: 2, area: 32, floor: '8', total_floors: 14, status: '委託中', commission_deadline: day(45), description: '近大安森林公園、捷運步行 5 分鐘，屋況極佳，屋主誠售。', created_at: day(-12), updated_at: day(-2) },
  { title: '信義計畫區 高樓層景觀豪邸', address: '台北市信義區松仁路 100 號 28 樓', district: '信義區', price: 5980, type: '買賣', rooms: 4, bathrooms: 3, area: 58, floor: '28', total_floors: 32, status: '議價中', commission_deadline: day(6), description: '面 101 景觀，雙主臥配置，管理優良。', created_at: day(-30), updated_at: day(-1) },
  { title: '中山國中捷運 2 房美寓', address: '台北市中山區復興北路 200 號 5 樓', district: '中山區', price: 1880, type: '買賣', rooms: 2, bathrooms: 1, area: 22, floor: '5', total_floors: 7, status: '帶看中', commission_deadline: day(20), description: '捷運中山國中站旁，生活機能成熟，首購族首選。', created_at: day(-7), updated_at: day(-1) },
  { title: '內湖科技園區 三房附車位', address: '台北市內湖區瑞光路 300 號 12 樓', district: '內湖區', price: 2680, type: '買賣', rooms: 3, bathrooms: 2, area: 38, floor: '12', total_floors: 18, status: '成交', commission_deadline: day(-15), description: '內科商圈，科技新貴最愛，含平面車位。', created_at: day(-60), updated_at: day(-15) },
  { title: '松山機場旁精緻套房 (出租)', address: '台北市松山區敦化北路 88 號 3 樓', district: '松山區', price: 35, type: '租賃', rooms: 1, bathrooms: 1, area: 9, floor: '3', total_floors: 12, status: '委託中', commission_deadline: day(30), description: '全新整理裝潢、家具家電齊全、可短租。', created_at: day(-5), updated_at: day(-1) },
  { title: '大安老公寓低總價投資物件', address: '台北市大安區和平東路三段 50 號 4 樓', district: '大安區', price: 1380, type: '買賣', rooms: 2, bathrooms: 1, area: 18, floor: '4', total_floors: 5, status: '解除委託', commission_deadline: day(-3), description: '屋主降價未果，已解除委託。可作為案例參考。', created_at: day(-90), updated_at: day(-3) },
].map((r) => ({
  ...r,
  commission_deadline: r.commission_deadline.toISOString().slice(0, 10),
  created_at: r.created_at.toISOString(),
  updated_at: r.updated_at.toISOString(),
  owner_id: owner.id,
  images: [],
}));

const { data, error } = await admin.from('properties').insert(rows).select('id, title');
if (error) {
  console.error('insert failed:', error);
  process.exit(3);
}
console.log(`inserted ${data.length} properties`);
data.forEach((p) => console.log(`  ${p.id.slice(0, 8)}  ${p.title}`));
