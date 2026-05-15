/**
 * MiniMax chat completion via the OpenAI-compatible endpoint.
 * Docs: https://platform.minimax.io/docs/api-reference/text-chat
 *
 * Bearer-auth POST /v1/chat/completions. We use JSON-mode prompting (not
 * response_format) for maximum compatibility.
 */

interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

interface CompletionParams {
  messages: Message[];
  temperature?: number;
  maxTokens?: number;
  model?: string;
  timeoutMs?: number;
}

interface CompletionResult {
  text: string;
  raw: unknown;
}

function env() {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Missing MINIMAX_API_KEY — set it in Vercel env to enable AI parsing.",
    );
  }
  return {
    apiKey,
    baseUrl: process.env.MINIMAX_BASE_URL || "https://api.minimax.io/v1",
    model: process.env.MINIMAX_MODEL || "MiniMax-M2.7",
  };
}

export async function chatComplete({
  messages,
  temperature = 0.1,
  maxTokens = 512,
  model,
  timeoutMs = 8000,
}: CompletionParams): Promise<CompletionResult> {
  const { apiKey, baseUrl, model: defaultModel } = env();

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  let res: Response;
  try {
    res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model ?? defaultModel,
        messages,
        temperature,
        max_tokens: maxTokens,
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`MiniMax ${res.status}: ${errText.slice(0, 200)}`);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  return { text, raw: json };
}

/**
 * Extract a JSON object embedded in a model response (handles ```json fences
 * and prose surrounding the object).
 */
export function extractJson<T = unknown>(text: string): T | null {
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fence ? fence[1] : text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(candidate.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
