import type { ChatMessage } from "./types";

// Cliente OpenAI usando fetch nativo — funciona em Cloudflare Workers
// sem dependência do SDK Node. Configurável por env.

const OPENAI_BASE = "https://api.openai.com/v1";

interface ChatCompletionOptions {
  apiKey: string;
  model: string;
  messages: ChatMessage[];
  systemPrompt: string;
  maxTokens?: number;
  temperature?: number;
  timeoutMs?: number;
}

export async function chatComplete(opts: ChatCompletionOptions): Promise<string> {
  const { apiKey, model, messages, systemPrompt, maxTokens = 700, temperature = 0.8, timeoutMs = 20000 } = opts;
  if (!apiKey) throw new Error("OPENAI_API_KEY não configurada");

  const fullMessages = [
    { role: "system", content: systemPrompt },
    ...messages.map((m) => ({ role: m.role, content: m.content })),
  ];

  const resp = await fetch(`${OPENAI_BASE}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages: fullMessages,
      max_tokens: maxTokens,
      temperature,
    }),
    signal: AbortSignal.timeout(timeoutMs),
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`OpenAI ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content?.trim() ?? "";
}

interface TranscribeOptions {
  apiKey: string;
  base64: string;
  mime: string;
  language?: string;
  timeoutMs?: number;
}

export async function transcribeAudio(opts: TranscribeOptions): Promise<string | null> {
  const { apiKey, base64, mime, language = "pt", timeoutMs = 30000 } = opts;
  if (!apiKey) return null;
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const ext = mime.includes("ogg") ? "ogg" : mime.includes("mp4") ? "mp4" : mime.includes("webm") ? "webm" : "ogg";
    const form = new FormData();
    form.append("file", new Blob([bytes], { type: mime || "audio/ogg" }), `audio.${ext}`);
    form.append("model", "whisper-1");
    form.append("language", language);

    const resp = await fetch(`${OPENAI_BASE}/audio/transcriptions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: form,
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      console.error("[whisper]", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const data = (await resp.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch (e) {
    console.error("[whisper] error:", e instanceof Error ? e.message : e);
    return null;
  }
}

interface VisionOptions {
  apiKey: string;
  model: string;
  base64: string;
  mime: string;
  prompt: string;
  maxTokens?: number;
  timeoutMs?: number;
}

export async function visionAnalyze(opts: VisionOptions): Promise<string | null> {
  const { apiKey, model, base64, mime, prompt, maxTokens = 500, timeoutMs = 25000 } = opts;
  if (!apiKey) return null;
  try {
    const dataUrl = `data:${mime || "image/jpeg"};base64,${base64}`;
    const resp = await fetch(`${OPENAI_BASE}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      console.error("[vision]", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const data = (await resp.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() ?? null;
  } catch (e) {
    console.error("[vision] error:", e instanceof Error ? e.message : e);
    return null;
  }
}
