// CRUD smoke test against reminders table with RLS, as the user.
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
const { data: created, error: cErr } = await supabase.from('reminders').insert({
  type: '自訂',
  title: 'CRUD smoke 測試提醒',
  target_id: null,
  remind_at: new Date(Date.now() + 86400e3).toISOString(),
  is_done: false,
  created_by: userId,
}).select().single();
if (cErr) { console.error('  FAIL:', cErr.message); process.exit(2); }
console.log('  OK:', created.id.slice(0, 8), created.title);
const id = created.id;

// READ
console.log('\n[READ]');
const { data: list } = await supabase.from('reminders').select('id, title, is_done').order('remind_at', { ascending: true });
console.log(`  OK: ${list.length} rows visible, new in list: ${list.some((r) => r.id === id)}`);

// TOGGLE
console.log('\n[TOGGLE is_done]');
const { data: toggled, error: tErr } = await supabase
  .from('reminders').update({ is_done: true }).eq('id', id).select().single();
if (tErr) { console.error('  FAIL:', tErr.message); process.exit(3); }
console.log('  OK: is_done =', toggled.is_done);

// DELETE
console.log('\n[DELETE]');
const { error: dErr, count } = await supabase.from('reminders').delete({ count: 'exact' }).eq('id', id);
if (dErr) { console.error('  FAIL:', dErr.message); process.exit(4); }
console.log('  OK: deleted', count, 'row(s)');

// RLS deny
console.log('\n[RLS] foreign created_by should be rejected');
const { error: rlsErr } = await supabase.from('reminders').insert({
  type: '自訂', title: 'rls deny',
  remind_at: new Date().toISOString(),
  created_by: '00000000-0000-0000-0000-000000000000',
});
console.log('  ', rlsErr ? `OK: ${rlsErr.message}` : 'FAIL: insert was allowed (RLS hole)');
