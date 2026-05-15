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

interface LineTextMessage {
  type: "text";
  text: string;
}

interface LineUriAction {
  type: "uri";
  label: string;
  uri: string;
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

export function textMessage(text: string): LineTextMessage {
  return { type: "text", text };
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
