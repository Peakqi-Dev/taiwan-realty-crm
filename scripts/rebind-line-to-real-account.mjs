// One-shot: ensure peakqi.com@gmail.com auth user exists, then move
// the LINE binding from dev-test@nivora.local to it.
//
// Run with:
//   node --env-file=.env.local scripts/rebind-line-to-real-account.mjs

import { createClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const REAL_EMAIL = 'peakqi.com@gmail.com';
const SOURCE_EMAIL = 'dev-test@nivora.local';

const admin = createClient(URL, SERVICE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('→ listing users');
const { data: list } = await admin.auth.admin.listUsers({ perPage: 1000 });
const users = list?.users ?? [];

const source = users.find((u) => u.email === SOURCE_EMAIL);
if (!source) {
  console.error(`  source user ${SOURCE_EMAIL} not found`);
  process.exit(1);
}
console.log('  source user:', source.id, source.email);

let real = users.find((u) => u.email === REAL_EMAIL);
if (!real) {
  console.log(`→ creating ${REAL_EMAIL}`);
  const { data: created, error } = await admin.auth.admin.createUser({
    email: REAL_EMAIL,
    email_confirm: true,
    user_metadata: { display_name: 'Jacky' },
  });
  if (error) {
    console.error('  createUser failed:', error.message);
    process.exit(2);
  }
  real = created.user;
}
console.log('  real user:', real.id, real.email);

console.log('→ looking up LINE binding on source');
const { data: srcBinding } = await admin
  .from('line_bindings')
  .select('line_user_id, bound_at, unbound_at')
  .eq('user_id', source.id)
  .maybeSingle();

if (!srcBinding || srcBinding.unbound_at) {
  console.log('  no active LINE binding on source; nothing to move.');
  process.exit(0);
}
const lineUserId = srcBinding.line_user_id;
console.log('  found line_user_id:', lineUserId);

console.log('→ moving binding to real user');
// Two-step (PK on user_id means we can't update user_id; delete + insert).
const { error: delErr } = await admin
  .from('line_bindings')
  .delete()
  .eq('user_id', source.id);
if (delErr) {
  console.error('  delete failed:', delErr.message);
  process.exit(3);
}

// If real user already has a binding (shouldn't, but guard), upsert.
const { error: upErr } = await admin.from('line_bindings').upsert(
  {
    user_id: real.id,
    line_user_id: lineUserId,
    bound_at: srcBinding.bound_at,
    unbound_at: null,
  },
  { onConflict: 'user_id' },
);
if (upErr) {
  console.error('  insert failed:', upErr.message);
  process.exit(4);
}
console.log('  binding moved ✓');

console.log('\n→ generating magic link for', REAL_EMAIL);
const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
  type: 'magiclink',
  email: REAL_EMAIL,
});
if (linkErr) {
  console.warn('  magic link generation failed:', linkErr.message);
} else {
  console.log('  action_link:', linkData?.properties?.action_link ?? '(none)');
}

console.log('\n✅ done');
