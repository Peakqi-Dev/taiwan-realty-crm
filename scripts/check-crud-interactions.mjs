// CRUD smoke test against interactions table with RLS, as the user.
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

// Need a real client_id for FK
const { data: anyClient } = await supabase.from('clients').select('id, name').limit(1).single();
if (!anyClient) { console.error('no clients to attach interaction to'); process.exit(2); }
console.log('using client:', anyClient.id.slice(0, 8), anyClient.name);

// CREATE
console.log('\n[CREATE]');
const { data: created, error: cErr } = await supabase.from('interactions').insert({
  client_id: anyClient.id, property_id: null,
  type: '電話', note: 'CRUD smoke test',
  created_by: userId,
}).select().single();
if (cErr) { console.error('  FAIL:', cErr.message); process.exit(3); }
console.log('  OK:', created.id.slice(0, 8), created.type, created.note);
const id = created.id;

// READ — interactionsFor pattern
console.log('\n[READ] interactionsFor this client');
const { data: list } = await supabase.from('interactions').select('*').eq('client_id', anyClient.id).order('created_at', { ascending: false });
console.log(`  OK: ${list.length} rows for client, new in list: ${list.some((i) => i.id === id)}`);

// DELETE
console.log('\n[DELETE]');
const { error: dErr, count } = await supabase.from('interactions').delete({ count: 'exact' }).eq('id', id);
if (dErr) { console.error('  FAIL:', dErr.message); process.exit(4); }
console.log('  OK: deleted', count, 'row(s)');

// RLS deny: foreign created_by
console.log('\n[RLS] foreign created_by should be rejected');
const { error: rlsErr } = await supabase.from('interactions').insert({
  client_id: anyClient.id, type: '電話', note: 'deny',
  created_by: '00000000-0000-0000-0000-000000000000',
});
console.log('  ', rlsErr ? `OK: ${rlsErr.message}` : 'FAIL: insert allowed');

// RLS deny: attach to a foreign client_id (RLS subquery in policy)
console.log('\n[RLS] interaction.client_id pointing to non-owned client should be rejected');
const { error: foreignClientErr } = await supabase.from('interactions').insert({
  client_id: '00000000-0000-0000-0000-000000000000',
  type: '電話', note: 'deny', created_by: userId,
});
console.log('  ', foreignClientErr ? `OK: ${foreignClientErr.message}` : 'FAIL: insert allowed');
