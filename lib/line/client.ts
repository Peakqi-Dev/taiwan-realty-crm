const LINE_API = "https://api.line.me/v2/bot";

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  language?: string;
}

/**
 * Fetch a LINE user's public profile (display name, avatar). Returns null
 * when the user blocks profile access or the API fails.
 */
export async function getProfile(
  accessToken: string,
  userId: string,
): Promise<LineProfile | null> {
  const res = await fetch(`${LINE_API}/profile/${userId}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  return (await res.json()) as LineProfile;
}

interface LineMessageAction {
  type: "message";
  label: string;
  text: string;
}

interface LineUriAction {
  type: "uri";
  label: string;
  uri: string;
}

type LineQuickReplyAction = LineMessageAction | LineUriAction;

interface LineQuickReply {
  items: { type: "action"; action: LineQuickReplyAction }[];
}

interface LineTextMessage {
  type: "text";
  text: string;
  quickReply?: LineQuickReply;
}

interface LineButtonTemplateMessage {
  type: "template";
  altText: string;
  template: {
    type: "buttons";
    text: string;
    actions: LineUriAction[];
  };
}

export type LineMessage = LineTextMessage | LineButtonTemplateMessage;

/**
 * Reply to a LINE event using its replyToken. Reply tokens expire after ~1 minute
 * and can only be used once.
 */
export async function replyMessage(
  accessToken: string,
  replyToken: string,
  messages: LineMessage[],
): Promise<{ ok: boolean; status: number; body?: string }> {
  const res = await fetch(`${LINE_API}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ replyToken, messages }),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }
  return { ok: true, status: res.status };
}

/**
 * Show a typing-style loading indicator in the user's chat for up to N
 * seconds (5-60, rounded down to multiples of 5). Useful while running a
 * slow operation (AI call) — does NOT count as a sent message.
 * https://developers.line.biz/en/docs/messaging-api/use-loading-indicator/
 */
export async function startLoadingAnimation(
  accessToken: string,
  chatId: string,
  loadingSeconds = 20,
): Promise<{ ok: boolean; status: number; body?: string }> {
  const res = await fetch(`${LINE_API}/chat/loading/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ chatId, loadingSeconds }),
  });
  if (!res.ok) return { ok: false, status: res.status, body: await res.text() };
  return { ok: true, status: res.status };
}

/**
 * Push an unsolicited message to a LINE user (e.g. daily digest).
 */
export async function pushMessage(
  accessToken: string,
  to: string,
  messages: LineMessage[],
): Promise<{ ok: boolean; status: number; body?: string }> {
  const res = await fetch(`${LINE_API}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ to, messages }),
  });
  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }
  return { ok: true, status: res.status };
}

export function textMessage(
  text: string,
  quickReplies?: LineQuickReplyAction[],
): LineTextMessage {
  const msg: LineTextMessage = { type: "text", text };
  if (quickReplies && quickReplies.length > 0) {
    msg.quickReply = {
      items: quickReplies.map((action) => ({ type: "action", action })),
    };
  }
  return msg;
}

export function buttonsTemplate(opts: {
  altText: string;
  text: string;
  actions: LineUriAction[];
}): LineButtonTemplateMessage {
  return {
    type: "template",
    altText: opts.altText,
    template: { type: "buttons", text: opts.text, actions: opts.actions },
  };
}
