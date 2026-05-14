// CRUD smoke test against properties table with RLS, as the user.
// Exercises the same code path Server Actions use (supabase client with user session → RLS sees auth.uid()).

import { createServerClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.argv[2] || 'dev-test@nivora.local';
const PASSWORD = process.argv[3] || 'DevTest1234!';

const jar = new Map();
const supabase = createServerClient(URL, ANON, {
  cookies: {
    getAll: () => [...jar.entries()].map(([n, v]) => ({ name: n, value: v })),
    setAll: (list) => list.forEach(({ name, value }) => jar.set(name, value)),
  },
});

const { data: signin, error: sErr } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (sErr) { console.error('sign in failed:', sErr.message); process.exit(1); }
const userId = signin.user.id;
console.log('signed in:', signin.user.email, userId);

// CREATE
console.log('\n[CREATE] insert a new property');
const { data: created, error: cErr } = await supabase.from('properties').insert({
  title: 'CRUD smoke 測試物件',
  address: '台北市中正區忠孝東路 999 號',
  district: '中正區',
  price: 1234,
  type: '買賣',
  rooms: 2,
  bathrooms: 1,
  area: 20,
  floor: '5',
  total_floors: 10,
  status: '委託中',
  commission_deadline: new Date(Date.now() + 30 * 86400e3).toISOString().slice(0, 10),
  description: 'CRUD test',
  owner_id: userId,
  images: [],
}).select().single();
if (cErr) { console.error('  FAIL:', cErr.message); process.exit(2); }
console.log('  OK:', created.id.slice(0, 8), created.title);
const createdId = created.id;

// READ (via list — RLS should show this row)
console.log('\n[READ] list properties');
const { data: list, error: rErr } = await supabase.from('properties').select('id, title').order('created_at', { ascending: false });
if (rErr) { console.error('  FAIL:', rErr.message); process.exit(3); }
console.log(`  OK: ${list.length} rows visible, new row in list: ${list.some((p) => p.id === createdId)}`);

// UPDATE
console.log('\n[UPDATE] change status + price');
const { data: updated, error: uErr } = await supabase
  .from('properties').update({ status: '帶看中', price: 1500 })
  .eq('id', createdId).select().single();
if (uErr) { console.error('  FAIL:', uErr.message); process.exit(4); }
console.log('  OK:', updated.status, updated.price, '萬元');

// DELETE
console.log('\n[DELETE] remove the row');
const { error: dErr, count } = await supabase.from('properties').delete({ count: 'exact' }).eq('id', createdId);
if (dErr) { console.error('  FAIL:', dErr.message); process.exit(5); }
console.log('  OK: deleted', count, 'row(s)');

// Verify it's gone
const { data: final } = await supabase.from('properties').select('id').eq('id', createdId);
console.log('\n[VERIFY] row gone:', final.length === 0 ? 'OK' : 'FAIL — still exists');

// RLS deny: try to insert with a fake owner_id
console.log('\n[RLS] insert with foreign owner_id should fail');
const { error: rlsErr } = await supabase.from('properties').insert({
  title: 'RLS deny',
  address: 'x', district: '中正區', price: 1, type: '買賣',
  commission_deadline: '2026-12-31',
  owner_id: '00000000-0000-0000-0000-000000000000',
});
console.log('  ', rlsErr ? `OK: ${rlsErr.message}` : 'FAIL: insert was allowed (RLS hole)');
