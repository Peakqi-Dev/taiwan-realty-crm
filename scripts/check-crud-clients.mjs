// CRUD smoke test against clients table with RLS, as the user.
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
console.log('\n[CREATE]');
const { data: created, error: cErr } = await supabase.from('clients').insert({
  name: 'CRUD 測試客戶', phone: '0900-000-000', line_id: null,
  type: '買方', status: '新客戶',
  budget_min: 1000, budget_max: 2000,
  preferred_districts: ['中正區'], requirements: 'CRUD test',
  assigned_to: userId,
}).select().single();
if (cErr) { console.error('  FAIL:', cErr.message); process.exit(2); }
console.log('  OK:', created.id.slice(0, 8), created.name);
const id = created.id;

// READ
console.log('\n[READ]');
const { data: list } = await supabase.from('clients').select('id, name').order('created_at', { ascending: false });
console.log(`  OK: ${list.length} rows visible, new row in list: ${list.some((c) => c.id === id)}`);

// UPDATE
console.log('\n[UPDATE]');
const { data: updated, error: uErr } = await supabase
  .from('clients').update({ status: '帶看', budget_max: 2500 })
  .eq('id', id).select().single();
if (uErr) { console.error('  FAIL:', uErr.message); process.exit(3); }
console.log('  OK:', updated.status, 'budget_max:', updated.budget_max);

// DELETE
console.log('\n[DELETE]');
const { error: dErr, count } = await supabase.from('clients').delete({ count: 'exact' }).eq('id', id);
if (dErr) { console.error('  FAIL:', dErr.message); process.exit(4); }
console.log('  OK: deleted', count, 'row(s)');

// RLS deny
console.log('\n[RLS] foreign assigned_to should be rejected');
const { error: rlsErr } = await supabase.from('clients').insert({
  name: 'rls deny', phone: 'x', type: '買方', assigned_to: '00000000-0000-0000-0000-000000000000',
});
console.log('  ', rlsErr ? `OK: ${rlsErr.message}` : 'FAIL: insert was allowed (RLS hole)');

// Budget range check
console.log('\n[CHECK] budget_min > budget_max should be rejected at DB level');
const { error: bErr } = await supabase.from('clients').insert({
  name: 'budget bad', phone: 'x', type: '買方', assigned_to: userId,
  budget_min: 5000, budget_max: 1000,
});
console.log('  ', bErr ? `OK: ${bErr.message}` : 'FAIL: bad budget allowed');
