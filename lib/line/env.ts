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
  };
}
