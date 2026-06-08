import process from "node:process";
import { createFileRoute } from "@tanstack/react-router";
import { handleIncoming } from "@/lib/agent/conversation.server";
import { isSupabaseConfigured } from "@/lib/agent/state-store.server";
import type { EvolutionMessagePayload } from "@/lib/agent/types";

// Webhook que a Evolution API chama quando uma mensagem chega.
// Configure na Evolution apontando pra:
//   POST {APP_URL}/api/webhook/evolution
// Evento: MESSAGES_UPSERT
//
// IMPORTANTE: usa o formato atual de rota de servidor do TanStack Start
// (createFileRoute + server.handlers). O formato antigo createServerFileRoute
// NÃO entra na árvore de rotas e resulta em 404 no app publicado.

interface EvolutionWebhookBody {
  event?: string;
  instance?: { instanceName?: string } | string;
  data?: {
    key?: { id?: string; remoteJid?: string; fromMe?: boolean };
    pushName?: string;
    message?: Record<string, unknown>;
    messageType?: string;
  };
}

function extractPayload(body: EvolutionWebhookBody): EvolutionMessagePayload | { skip: string } {
  const event = body.event ?? "";
  if (event !== "messages.upsert" && event !== "MESSAGES_UPSERT") return { skip: `event:${event || "none"}` };

  const data = body.data ?? {};
  const key = data.key ?? {};
  if (!key.id) return { skip: "no_message_id" };
  if (key.fromMe === true) return { skip: "from_me" };

  const remoteJid = key.remoteJid ?? "";
  if (remoteJid.includes("@g.us")) return { skip: "group" };

  const phone = remoteJid.replace("@s.whatsapp.net", "").replace(/\D/g, "");
  if (!phone || phone.length < 8) return { skip: "invalid_phone" };

  const instanceName =
    typeof body.instance === "string"
      ? body.instance
      : body.instance?.instanceName ?? "default";

  const message = data.message ?? {};
  const audioMsg = message.audioMessage as Record<string, unknown> | undefined;
  const imageMsg = message.imageMessage as Record<string, unknown> | undefined;
  const videoMsg = message.videoMessage as Record<string, unknown> | undefined;
  const docMsg = message.documentMessage as Record<string, unknown> | undefined;
  const stickerMsg = message.stickerMessage as Record<string, unknown> | undefined;
  const textFromConv = message.conversation as string | undefined;
  const textFromExt = (message.extendedTextMessage as Record<string, unknown> | undefined)?.text as string | undefined;
  const captionImg = imageMsg?.caption as string | undefined;
  const captionVid = videoMsg?.caption as string | undefined;
  const captionDoc = docMsg?.caption as string | undefined;
  const directText = (textFromConv ?? textFromExt ?? "").trim();

  let mediaType: EvolutionMessagePayload["mediaType"] = null;
  let mediaMime: string | undefined;
  let caption: string | undefined;

  if (audioMsg) {
    mediaType = "audio";
    mediaMime = (audioMsg.mimetype as string) ?? "audio/ogg";
  } else if (imageMsg) {
    mediaType = "image";
    mediaMime = (imageMsg.mimetype as string) ?? "image/jpeg";
    caption = captionImg;
  } else if (videoMsg) {
    mediaType = "video";
    caption = captionVid;
  } else if (docMsg) {
    mediaType = "document";
    caption = captionDoc;
  } else if (stickerMsg) {
    mediaType = "sticker";
  }

  return {
    messageId: key.id,
    fromMe: false,
    phone,
    pushName: data.pushName ?? "Contato",
    instance: instanceName,
    text: directText,
    mediaType,
    mediaMime,
    caption,
    isGroup: false,
  };
}

export const Route = createFileRoute("/api/webhook/evolution")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: EvolutionWebhookBody;
        try {
          body = (await request.json()) as EvolutionWebhookBody;
        } catch {
          return new Response(JSON.stringify({ ok: false, error: "invalid_json" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const extracted = extractPayload(body);
        if ("skip" in extracted) {
          return new Response(JSON.stringify({ ok: true, skipped: extracted.skip }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }

        // Processa inline; não retorna 500 pra evitar reentrega/duplicação.
        try {
          await handleIncoming({ payload: extracted });
        } catch (e) {
          console.error("[webhook] handler error:", e instanceof Error ? e.message : e);
        }

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },

      GET: async () => {
        // Diagnóstico: mostra SE as variáveis chegaram no servidor (só booleans,
        // nunca os valores). Serve pra confirmar a config do Lovable sem chutar.
        const env = {
          openai: Boolean(process.env.OPENAI_API_KEY),
          evolution_url: Boolean(process.env.EVOLUTION_API_URL ?? process.env.VITE_EVOLUTION_API_URL),
          evolution_key: Boolean(process.env.EVOLUTION_API_KEY ?? process.env.VITE_EVOLUTION_API_KEY),
          // Opcionais (follow-ups): se false, o atendimento funciona mas sem follow-up/persistência.
          supabase: isSupabaseConfigured(),
          cron_secret: Boolean(process.env.CRON_SECRET),
          exemplos_audio: Boolean(process.env.EXEMPLOS_AUDIO_URLS),
        };
        const ready = env.openai && env.evolution_url && env.evolution_key;
        return new Response(
          JSON.stringify({
            ok: true,
            ready,
            env,
            message: ready
              ? "Tudo certo! Webhook vivo e variaveis configuradas. Pronto pra receber MESSAGES_UPSERT."
              : "Webhook vivo, mas faltam variaveis no servidor (veja 'env': false = nao chegou).",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
