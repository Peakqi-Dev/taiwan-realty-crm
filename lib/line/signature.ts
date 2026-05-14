import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verifies the x-line-signature header for a LINE webhook request.
 * Returns true if the signature matches HMAC-SHA256(rawBody, channelSecret).
 *
 * Per LINE docs: signature = base64(hmacSha256(channelSecret, requestBody))
 * https://developers.line.biz/en/reference/messaging-api/#signature-validation
 */
export function verifyLineSignature(
  rawBody: string,
  signature: string | null,
  channelSecret: string,
): boolean {
  if (!signature) return false;
  const expected = createHmac("sha256", channelSecret)
    .update(rawBody, "utf8")
    .digest("base64");
  try {
    return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
  } catch {
    // length mismatch → not equal
    return false;
  }
}
