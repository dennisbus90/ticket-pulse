import {
  app,
  HttpRequest,
  HttpResponseInit,
  InvocationContext,
} from "@azure/functions";
import {
  buildSystemPrompt,
  AnalysisResult,
  AiProvider,
} from "@ticket-pulse/shared";

interface AnalyzeRequestBody {
  ticketText: string;
  provider: AiProvider;
  model: string;
  apiKey: string;
  projectContext?: string;
}

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function corsResponse(status: number, body: unknown): HttpResponseInit {
  return {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    jsonBody: body,
  };
}

async function callClaude(
  apiKey: string,
  model: string,
  systemPrompt: string,
  ticketText: string,
): Promise<string> {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [{ role: "user", content: ticketText }],
    }),
  });

  const json: any = await res.json();
  if (json.error) {
    throw new Error(json.error.message);
  }
  return json.content[0].text;
}

async function callOpenAI(
  apiKey: string,
  model: string,
  systemPrompt: string,
  ticketText: string,
): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: 1000,
      temperature: 0.3,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: ticketText },
      ],
    }),
  });

  const json: any = await res.json();
  if (json.error) {
    throw new Error(json.error.message);
  }
  return json.choices[0].message.content;
}

function parseAiResponse(raw: string): AnalysisResult {
  const cleaned = raw.replace(/```json?\n?|\n?```/g, "").trim();
  return JSON.parse(cleaned) as AnalysisResult;
}

async function analyzeHandler(
  request: HttpRequest,
  context: InvocationContext,
): Promise<HttpResponseInit> {
  // Handle CORS preflight
  if (request.method === "OPTIONS") {
    return { status: 204, headers: CORS_HEADERS };
  }

  try {
    const body = (await request.json()) as Partial<AnalyzeRequestBody>;

    // Validate required fields
    if (!body.ticketText || typeof body.ticketText !== "string") {
      return corsResponse(400, { error: "Missing or invalid 'ticketText'" });
    }
    if (
      !body.provider ||
      (body.provider !== "openai" && body.provider !== "claude")
    ) {
      return corsResponse(400, {
        error: "Missing or invalid 'provider' (must be 'openai' or 'claude')",
      });
    }
    if (!body.model || typeof body.model !== "string") {
      return corsResponse(400, { error: "Missing or invalid 'model'" });
    }
    if (!body.apiKey || typeof body.apiKey !== "string") {
      return corsResponse(400, { error: "Missing or invalid 'apiKey'" });
    }

    const { ticketText, provider, model, apiKey, projectContext } =
      body as AnalyzeRequestBody;

    const systemPrompt = buildSystemPrompt(projectContext);

    context.log(`Calling ${provider} with model ${model}`);

    let raw: string;

    if (provider === "claude") {
      raw = await callClaude(apiKey, model, systemPrompt, ticketText);
    } else {
      raw = await callOpenAI(apiKey, model, systemPrompt, ticketText);
    }

    const result = parseAiResponse(raw);

    return corsResponse(200, result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    context.error(`Analysis failed: ${message}`);
    return corsResponse(500, { error: message });
  }
}

app.http("analyze", {
  methods: ["POST", "OPTIONS"],
  authLevel: "function",
  handler: analyzeHandler,
});
