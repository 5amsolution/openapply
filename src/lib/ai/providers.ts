import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

// Every user brings their own key. Anthropic goes through the official SDK;
// the other providers all speak the OpenAI-compatible chat completions API.

export type ProviderId = "anthropic" | "openai" | "gemini" | "openrouter" | "groq" | "custom";

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  keyUrl: string;
  baseUrl?: string;
  models: { id: string; label: string }[];
}

/**
 * Free OpenRouter models that support JSON output, best first. A free model
 * falls back to the next ones automatically when it is busy or removed.
 */
export const FREE_OPENROUTER_MODELS = [
  "google/gemma-4-31b-it:free",
  "nvidia/nemotron-3-super-120b-a12b:free",
  "google/gemma-4-26b-a4b-it:free",
];
export const DEFAULT_OPENROUTER_MODEL = FREE_OPENROUTER_MODELS[0];

export const PROVIDERS: ProviderInfo[] = [
  {
    id: "anthropic",
    label: "Anthropic (Claude)",
    keyUrl: "https://console.anthropic.com/settings/keys",
    models: [
      { id: "claude-opus-5", label: "Claude Opus 5 — best quality" },
      { id: "claude-sonnet-5", label: "Claude Sonnet 5 — balanced" },
      { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 — cheapest, fastest" },
      { id: "claude-fable-5", label: "Claude Fable 5 — most capable, premium price" },
    ],
  },
  {
    id: "openai",
    label: "OpenAI",
    keyUrl: "https://platform.openai.com/api-keys",
    baseUrl: "https://api.openai.com/v1",
    models: [
      { id: "gpt-5", label: "GPT-5" },
      { id: "gpt-5-mini", label: "GPT-5 mini" },
    ],
  },
  {
    id: "gemini",
    label: "Google Gemini",
    keyUrl: "https://aistudio.google.com/app/apikey",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    models: [
      { id: "gemini-2.5-pro", label: "Gemini 2.5 Pro" },
      { id: "gemini-2.5-flash", label: "Gemini 2.5 Flash" },
    ],
  },
  {
    id: "openrouter",
    label: "OpenRouter (any model)",
    keyUrl: "https://openrouter.ai/keys",
    baseUrl: "https://openrouter.ai/api/v1",
    models: [
      ...FREE_OPENROUTER_MODELS.map((id) => ({ id, label: `${id.replace(/:free$/, "")} — free` })),
      { id: "anthropic/claude-sonnet-5", label: "Claude Sonnet 5 (paid, best writing)" },
      { id: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5 (paid, cheap)" },
      { id: "openai/gpt-5-mini", label: "GPT-5 mini (paid, cheap)" },
    ],
  },
  {
    id: "groq",
    label: "Groq",
    keyUrl: "https://console.groq.com/keys",
    baseUrl: "https://api.groq.com/openai/v1",
    models: [{ id: "llama-3.3-70b-versatile", label: "Llama 3.3 70B" }],
  },
  {
    id: "custom",
    label: "Custom (OpenAI-compatible, e.g. Ollama, LM Studio)",
    keyUrl: "",
    models: [],
  },
];

export function providerInfo(id: string): ProviderInfo | undefined {
  return PROVIDERS.find((p) => p.id === id);
}

export interface AIConfig {
  provider: ProviderId;
  model: string;
  apiKey: string;
  baseUrl?: string | null;
}

export interface AIUsage {
  inputTokens: number;
  outputTokens: number;
}

export class AIError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AIError";
  }
}

// Models that support Anthropic's server-side refusal fallback.
const FALLBACK_MODELS = ["claude-opus-5", "claude-fable-5"];

/**
 * Ask the model for a JSON object matching `schema`. Returns the parsed value
 * and token usage (so the caller can record what the user spent).
 */
export async function generateObject<T extends z.ZodType>(
  config: AIConfig,
  opts: { system: string; prompt: string; schema: T; maxTokens?: number },
): Promise<{ data: z.infer<T>; usage: AIUsage }> {
  const maxTokens = opts.maxTokens ?? 8000;
  if (config.provider === "anthropic") return anthropicObject(config, opts, maxTokens);
  return openAICompatibleObject(config, opts, maxTokens);
}

async function anthropicObject<T extends z.ZodType>(
  config: AIConfig,
  opts: { system: string; prompt: string; schema: T },
  maxTokens: number,
): Promise<{ data: z.infer<T>; usage: AIUsage }> {
  const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 2, timeout: 120_000 });
  const withFallback = FALLBACK_MODELS.includes(config.model);
  try {
    const response = await client.beta.messages.parse({
      model: config.model,
      max_tokens: maxTokens,
      system: opts.system,
      messages: [{ role: "user", content: opts.prompt }],
      output_config: { format: zodOutputFormat(opts.schema) },
      ...(withFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
    if (response.stop_reason === "refusal") {
      throw new AIError("The model declined this request.");
    }
    if (response.parsed_output == null) {
      throw new AIError(
        response.stop_reason === "max_tokens"
          ? "The model ran out of output tokens before finishing."
          : "The model returned output that did not match the expected format.",
      );
    }
    return {
      data: response.parsed_output as z.infer<T>,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  } catch (err) {
    if (err instanceof AIError) throw err;
    if (err instanceof Anthropic.AuthenticationError) {
      throw new AIError("Your Anthropic API key was rejected. Check it in Settings.", 401);
    }
    if (err instanceof Anthropic.PermissionDeniedError) {
      throw new AIError("Your Anthropic key does not have access to this model.", 403);
    }
    if (err instanceof Anthropic.NotFoundError) {
      throw new AIError(`Model "${config.model}" was not found for your Anthropic account.`, 404);
    }
    if (err instanceof Anthropic.RateLimitError) {
      throw new AIError("Anthropic rate limit or credit limit reached. Try again later.", 429);
    }
    if (err instanceof Anthropic.APIError) {
      throw new AIError(`Anthropic API error: ${err.message}`, err.status);
    }
    throw err;
  }
}

async function openAICompatibleObject<T extends z.ZodType>(
  config: AIConfig,
  opts: { system: string; prompt: string; schema: T },
  maxTokens: number,
): Promise<{ data: z.infer<T>; usage: AIUsage }> {
  const baseUrl = (config.baseUrl || providerInfo(config.provider)?.baseUrl || "").replace(/\/$/, "");
  if (!baseUrl) throw new AIError("This provider needs a base URL. Set one in Settings.");
  await assertPublicUrl(baseUrl);

  const jsonSchema = z.toJSONSchema(opts.schema, { target: "draft-7" });
  const system = `${opts.system}\n\nRespond with a single JSON object that matches this JSON Schema, and nothing else:\n${JSON.stringify(jsonSchema)}`;

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.apiKey}`,
      ...(config.provider === "openrouter"
        ? { "x-title": "OpenApply", "http-referer": process.env.NEXT_PUBLIC_SITE_URL || "https://github.com/MuhammadAbdullah80/openapply" }
        : {}),
    },
    body: JSON.stringify({
      model: config.model,
      ...(config.provider === "openrouter" ? openRouterRouting(config.model) : {}),
      max_completion_tokens: maxTokens,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: opts.prompt },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401) throw new AIError("Your API key was rejected. Check it in Settings.", 401);
    if (res.status === 429) {
      throw new AIError(
        config.provider === "openrouter" && config.model.endsWith(":free")
          ? "You've hit OpenRouter's free limit (50 requests a day, or 1,000 after a one-time $10 credit purchase). Try again tomorrow or pick a paid model."
          : "Provider rate limit or credit limit reached.",
        429,
      );
    }
    if (res.status === 402) throw new AIError("Your OpenRouter account is out of credits. Add credits or switch to a free model.", 402);
    throw new AIError(`AI provider error ${res.status}: ${body.slice(0, 300)}`, res.status);
  }

  const json = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = json.choices?.[0]?.message?.content ?? "";
  const parsed = opts.schema.safeParse(extractJSON(text));
  if (!parsed.success) throw new AIError("The model returned output that did not match the expected format.");
  return {
    data: parsed.data,
    usage: { inputTokens: json.usage?.prompt_tokens ?? 0, outputTokens: json.usage?.completion_tokens ?? 0 },
  };
}

function extractJSON(text: string): unknown {
  const trimmed = text.trim().replace(/^```(?:json)?\s*|\s*```$/g, "");
  try {
    return JSON.parse(trimmed);
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      try {
        return JSON.parse(trimmed.slice(start, end + 1));
      } catch {
        return null;
      }
    }
    return null;
  }
}

/**
 * On a shared server, a user-supplied base URL must not reach the host's own
 * network (cloud metadata, databases, other services). Self-hosters who want
 * a local model (Ollama, LM Studio) set ALLOW_PRIVATE_AI_URLS=true.
 */
async function assertPublicUrl(raw: string) {
  if (process.env.ALLOW_PRIVATE_AI_URLS === "true") return;
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new AIError("The base URL is not a valid URL.");
  }
  if (!/^https?:$/.test(url.protocol)) throw new AIError("The base URL must use http or https.");
  const { lookup } = await import("node:dns/promises");
  const addresses = await lookup(url.hostname, { all: true }).catch(() => []);
  if (addresses.length === 0) throw new AIError(`Could not resolve ${url.hostname}.`);
  if (addresses.some((a) => isPrivateAddress(a.address))) {
    throw new AIError("Private or local network addresses aren't allowed on this server. Self-host OpenApply to use a local model.");
  }
}

function isPrivateAddress(ip: string): boolean {
  const v4 = ip.startsWith("::ffff:") ? ip.slice(7) : ip;
  if (/^\d+\.\d+\.\d+\.\d+$/.test(v4)) {
    const [a, b] = v4.split(".").map(Number);
    return (
      a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224
    );
  }
  const v6 = ip.toLowerCase();
  return v6 === "::" || v6 === "::1" || v6.startsWith("fc") || v6.startsWith("fd") || v6.startsWith("fe80");
}

/** OpenRouter extras: automatic fallback between free models, and only providers that honor JSON mode. */
function openRouterRouting(model: string) {
  if (!model.endsWith(":free")) return { provider: { require_parameters: true } };
  const fallbacks = FREE_OPENROUTER_MODELS.filter((m) => m !== model).slice(0, 2);
  return { models: [model, ...fallbacks], provider: { require_parameters: true } };
}
