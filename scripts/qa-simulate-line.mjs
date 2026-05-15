// QA harness: post signed LINE webhook events to production and observe.
//
// Usage:
//   node --env-file=.env.local scripts/qa-simulate-line.mjs <test>
//
// Tests:
//   follow              — simulate a new user following the bot
//   text "msg"          — send a text message as the bound test user
//   text-rapid n        — send n short messages in quick succession
//   text-empty          — send an empty text
//   text-long           — send a 250-char message
//   unfollow            — simulate unfollow

import { createHmac } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

const SECRET = process.env.LINE_CHANNEL_SECRET;
const WEBHOOK = process.env.QA_WEBHOOK_URL || 'https://taiwan-realty-crm.vercel.app/api/line/webhook';
const TEST_LINE_USER_ID = process.env.QA_LINE_USER_ID || 'U4765607ee70d6029ae876a4bb5c42724'; // Jacky's
const TEST_REPLY_TOKEN = 'qa-fake-token-' + Date.now();

if (!SECRET) {
  console.error('Missing LINE_CHANNEL_SECRET');
  process.exit(1);
}

function sign(body) {
  return createHmac('sha256', SECRET).update(body, 'utf8').digest('base64');
}

async function postEvents(events) {
  const body = JSON.stringify({ destination: 'qa', events });
  const sig = sign(body);
  const t0 = Date.now();
  const res = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-line-signature': sig },
    body,
  });
  const text = await res.text();
  return { status: res.status, ms: Date.now() - t0, body: text };
}

function textEvent(text) {
  return {
    type: 'message',
    timestamp: Date.now(),
    source: { type: 'user', userId: TEST_LINE_USER_ID },
    replyToken: TEST_REPLY_TOKEN + '-' + Math.random().toString(36).slice(2, 6),
    message: { type: 'text', id: 'qa-' + Date.now(), text },
  };
}

function followEvent(userId = TEST_LINE_USER_ID) {
  return {
    type: 'follow',
    timestamp: Date.now(),
    source: { type: 'user', userId },
    replyToken: TEST_REPLY_TOKEN + '-follow',
  };
}

function unfollowEvent(userId = TEST_LINE_USER_ID) {
  return {
    type: 'unfollow',
    timestamp: Date.now(),
    source: { type: 'user', userId },
  };
}

const cmd = process.argv[2];
const arg = process.argv[3];

switch (cmd) {
  case 'follow': {
    const userId = arg || `Uqa${Date.now()}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.slice(0, 33);
    console.log('→ follow event for', userId);
    const r = await postEvents([followEvent(userId)]);
    console.log(`  HTTP ${r.status} (${r.ms}ms)`);
    console.log('  body:', r.body.slice(0, 200));
    break;
  }
  case 'text': {
    const t = arg || '王先生 3000 萬 信義區 三房';
    console.log(`→ text: ${t}`);
    const r = await postEvents([textEvent(t)]);
    console.log(`  HTTP ${r.status} (${r.ms}ms)`);
    console.log('  body:', r.body.slice(0, 200));
    break;
  }
  case 'text-rapid': {
    const n = parseInt(arg || '5', 10);
    console.log(`→ ${n} rapid texts`);
    const events = Array.from({ length: n }, (_, i) => textEvent(`測試訊息 ${i + 1}`));
    const r = await postEvents(events);
    console.log(`  HTTP ${r.status} (${r.ms}ms) for ${n} events`);
    console.log('  body:', r.body.slice(0, 200));
    break;
  }
  case 'text-empty': {
    console.log('→ empty text');
    const r = await postEvents([textEvent('')]);
    console.log(`  HTTP ${r.status} (${r.ms}ms)`);
    console.log('  body:', r.body.slice(0, 200));
    break;
  }
  case 'text-long': {
    const t = '我有一位客戶'.repeat(50);
    console.log(`→ long text (${t.length} chars)`);
    const r = await postEvents([textEvent(t)]);
    console.log(`  HTTP ${r.status} (${r.ms}ms)`);
    console.log('  body:', r.body.slice(0, 200));
    break;
  }
  case 'unfollow': {
    const userId = arg || TEST_LINE_USER_ID;
    console.log('→ unfollow', userId);
    const r = await postEvents([unfollowEvent(userId)]);
    console.log(`  HTTP ${r.status} (${r.ms}ms)`);
    console.log('  body:', r.body.slice(0, 200));
    break;
  }
  case 'inspect': {
    // Dump current state from DB
    const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const admin = createClient(URL, SERVICE, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: binding } = await admin
      .from('line_bindings')
      .select('*')
      .eq('line_user_id', TEST_LINE_USER_ID)
      .maybeSingle();
    console.log('binding:', binding);
    if (binding?.user_id) {
      const [{ count: c1 }, { count: c2 }, { count: c3 }, { data: pending }] =
        await Promise.all([
          admin.from('clients').select('*', { count: 'exact', head: true }).eq('assigned_to', binding.user_id),
          admin.from('properties').select('*', { count: 'exact', head: true }).eq('owner_id', binding.user_id),
          admin.from('reminders').select('*', { count: 'exact', head: true }).eq('created_by', binding.user_id),
          admin.from('line_pending_actions').select('*').eq('line_user_id', TEST_LINE_USER_ID),
        ]);
      console.log(`clients=${c1} properties=${c2} reminders=${c3} pending=${pending?.length ?? 0}`);
    }
    break;
  }
  default:
    console.log('Usage: follow | text "msg" | text-rapid n | text-empty | text-long | unfollow | inspect');
    process.exit(1);
}
