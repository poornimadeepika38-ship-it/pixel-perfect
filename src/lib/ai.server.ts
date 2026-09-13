const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3.8-flash";

export class AiGatewayError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function stripFences(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```[a-zA-Z]*\s*/, "")
      .replace(/```\s*$/, "")
      .trim();
  }
  return trimmed;
}

function extractJson(text: string) {
  const cleaned = stripFences(text);
  try {
    return JSON.parse(cleaned) as unknown;
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1)) as unknown;
    }
    throw new AiGatewayError(502, "The AI response could not be read.");
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Calls the Lovable AI Gateway and returns parsed JSON from the model. Retries transient failures. */
export async function generateJson<T>(system: string, user: string): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (attempt > 0) await sleep(1200 * attempt);
    try {
      return await requestJson<T>(system, user);
    } catch (error) {
      lastError = error;
      const status = error instanceof AiGatewayError ? error.status : 0;
      // Terminal: bad request, unauthorised, no credits, blocked.
      if (status === 400 || status === 401 || status === 402 || status === 403) throw error;
    }
  }
  throw lastError;
}

async function requestJson<T>(system: string, user: string): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiGatewayError(401, "AI is not configured for this app.");

  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": apiKey,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body;
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string }; message?: string };
      message = parsed.error?.message ?? parsed.message ?? body;
    } catch {
      /* keep raw body */
    }
    if (res.status === 429) {
      message = "The AI service is busy right now. Please wait a moment and try again.";
    } else if (res.status === 402) {
      message = message || "AI credits are exhausted for this workspace.";
    }
    throw new AiGatewayError(res.status, message);
  }

  const payload = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = payload.choices?.[0]?.message?.content ?? "";
  if (!content) throw new AiGatewayError(502, "The AI returned an empty response.");

  return extractJson(content) as T;
}
