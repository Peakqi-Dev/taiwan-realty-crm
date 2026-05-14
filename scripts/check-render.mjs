import { createServerClient } from '@supabase/ssr';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const EMAIL = process.argv[2] || 'dev-test@nivora.local';
const PASSWORD = process.argv[3] || 'DevTest1234!';
const TARGET = process.argv[4] || 'http://localhost:3000/properties';

if (!URL || !ANON) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL or _ANON_KEY');
  process.exit(1);
}

const jar = new Map();

const supabase = createServerClient(URL, ANON, {
  cookies: {
    getAll() {
      return [...jar.entries()].map(([name, value]) => ({ name, value }));
    },
    setAll(list) {
      for (const { name, value } of list) jar.set(name, value);
    },
  },
});

const { data, error } = await supabase.auth.signInWithPassword({
  email: EMAIL,
  password: PASSWORD,
});
if (error) {
  console.error('signIn failed:', error.message);
  process.exit(2);
}
console.log('signed in:', data.user.email);
console.log('cookies:', [...jar.keys()].join(', '));

const cookieHeader = [...jar.entries()]
  .map(([n, v]) => `${n}=${encodeURIComponent(v)}`)
  .join('; ');

const res = await fetch(TARGET, { headers: { Cookie: cookieHeader }, redirect: 'manual' });
console.log(`\nGET ${TARGET} → ${res.status}`);
const loc = res.headers.get('location');
if (loc) console.log('  Location:', loc);

const body = await res.text();
console.log('  body length:', body.length);

// Look for signals in server-rendered HTML
const probes = ['信義區', '大安區', '中山區', '萬元', '物件', '客戶', '提醒'];
for (const p of probes) {
  const count = body.split(p).length - 1;
  if (count > 0) console.log(`  contains "${p}": ${count}x`);
}

// Query Supabase as this user to confirm RLS-visible data exists
// (the client-side store fetches the same way)
const { data: props, error: pErr } = await supabase
  .from('properties')
  .select('id, title, district, status')
  .order('created_at', { ascending: false });
console.log(`\nSupabase /properties (as user, RLS): ${pErr ? 'ERROR ' + pErr.message : props.length + ' rows'}`);
if (props) for (const p of props) console.log(`  ${p.id.slice(0,8)}  ${p.district} · ${p.status} · ${p.title}`);
