import process from "node:process";

// Cliente Evolution API server-only. NÃO usar em código que vá pro client
// — a apikey é secreta. Pra UI use src/lib/api/evolution.ts que lê das
// variáveis VITE_* (e portanto é só leitura limitada / sem segredo).

function evolutionEnv() {
  const url = (process.env.EVOLUTION_API_URL ?? process.env.VITE_EVOLUTION_API_URL ?? "").replace(/\/+$/, "");
  const apiKey = process.env.EVOLUTION_API_KEY ?? process.env.VITE_EVOLUTION_API_KEY ?? "";
  return { url, apiKey };
}

interface SendTextOptions {
  instance: string;
  number: string;
  text: string;
  /** Delay em ms — Evolution mostra "digitando..." durante esse tempo antes de entregar. */
  delay?: number;
}

const SEND_MAX_ATTEMPTS = 3;
const SEND_BACKOFF_MS = 600;
const SEND_TIMEOUT_MS = 20000;

export async function sendText(opts: SendTextOptions): Promise<boolean> {
  const { instance, number, text, delay = 0 } = opts;
  const { url, apiKey } = evolutionEnv();
  if (!url || !apiKey) {
    console.error("[evolution] EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurada");
    return false;
  }

  let lastErr: string | undefined;
  for (let attempt = 1; attempt <= SEND_MAX_ATTEMPTS; attempt++) {
    try {
      const resp = await fetch(`${url}/message/sendText/${encodeURIComponent(instance)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: apiKey },
        body: JSON.stringify({ number, text, delay }),
        signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
      });
      if (resp.ok) return true;
      lastErr = `${resp.status} ${await resp.text().catch(() => "")}`.slice(0, 200);
      // 4xx terminais não adiantam retentar
      if (resp.status >= 400 && resp.status < 500 && resp.status !== 408 && resp.status !== 429) break;
    } catch (e) {
      lastErr = e instanceof Error ? e.message : String(e);
    }
    if (attempt < SEND_MAX_ATTEMPTS) {
      await new Promise((r) => setTimeout(r, SEND_BACKOFF_MS * attempt));
    }
  }
  console.error("[evolution] sendText failed:", lastErr);
  return false;
}

interface SendMediaOptions {
  instance: string;
  number: string;
  /** URL pública ou base64 do arquivo de mídia */
  media: string;
  mediatype: "audio" | "image" | "video" | "document";
  mimetype?: string;
  fileName?: string;
  delay?: number;
}

/** Envia mídia (áudio/imagem/etc) por URL pública ou base64 via Evolution. */
export async function sendMedia(opts: SendMediaOptions): Promise<boolean> {
  const { instance, number, media, mediatype, mimetype, fileName, delay = 0 } = opts;
  const { url, apiKey } = evolutionEnv();
  if (!url || !apiKey) {
    console.error("[evolution] EVOLUTION_API_URL ou EVOLUTION_API_KEY não configurada (sendMedia)");
    return false;
  }
  try {
    const resp = await fetch(`${url}/message/sendMedia/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ number, mediatype, mimetype, media, fileName, delay }),
      signal: AbortSignal.timeout(30000),
    });
    if (resp.ok) return true;
    console.error("[evolution] sendMedia failed:", resp.status, (await resp.text().catch(() => "")).slice(0, 200));
    return false;
  } catch (e) {
    console.error("[evolution] sendMedia error:", e instanceof Error ? e.message : e);
    return false;
  }
}

interface GetMediaOptions {
  instance: string;
  messageId: string;
  timeoutMs?: number;
}

export async function getMediaBase64(opts: GetMediaOptions): Promise<string | null> {
  const { instance, messageId, timeoutMs = 15000 } = opts;
  const { url, apiKey } = evolutionEnv();
  if (!url || !apiKey) return null;
  try {
    const resp = await fetch(`${url}/chat/getBase64FromMediaMessage/${encodeURIComponent(instance)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", apikey: apiKey },
      body: JSON.stringify({ message: { key: { id: messageId } }, convertToMp4: false }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!resp.ok) {
      console.error("[evolution] getMedia failed:", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const json = (await resp.json().catch(() => null)) as { base64?: string } | null;
    return json?.base64 ?? null;
  } catch (e) {
    console.error("[evolution] getMedia error:", e instanceof Error ? e.message : e);
    return null;
  }
}
