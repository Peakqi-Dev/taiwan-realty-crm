/**
 * LINE Bot environment. Returns nullable values so dev can boot without LINE
 * credentials; handlers should check and skip gracefully.
 */
export function lineEnv() {
  return {
    channelSecret: process.env.LINE_CHANNEL_SECRET || null,
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || null,
    // Full URL to the LIFF binding page (set in LINE Developers Console).
    liffUrl: process.env.LINE_LIFF_URL || null,
    // LIFF ID used by the /line/connect page to init the LIFF SDK.
    liffId: process.env.NEXT_PUBLIC_LIFF_ID || null,
    // Pre-registered Rich Menu IDs (from POST /v2/bot/richmenu). Set after
    // running scripts/setup-rich-menus.mjs. Webhook links the matching menu
    // to each user after follow.
    agentRichMenuId: process.env.LINE_RICH_MENU_AGENT_ID || null,
    customerRichMenuId: process.env.LINE_RICH_MENU_CUSTOMER_ID || null,
  };
}
