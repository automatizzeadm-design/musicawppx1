import process from "node:process";
import { createFileRoute } from "@tanstack/react-router";
import { isSupabaseConfigured, setPausedByPhone } from "@/lib/agent/state-store.server";

// Pausa/despausa o bot pra um número. Protegido por ?key=CRON_SECRET.
//   POST /api/agent/pause?key=...   body: { phone, paused?, instance? }
//   paused default true. instance default "soulmusic".

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function authorized(request: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  const key = new URL(request.url).searchParams.get("key") ?? "";
  return Boolean(secret) && key === secret;
}

export const Route = createFileRoute("/api/agent/pause")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!authorized(request)) return json({ ok: false, error: "unauthorized" }, 401);
        if (!isSupabaseConfigured()) return json({ ok: false, error: "supabase_nao_configurado" }, 503);
        const body = (await request.json().catch(() => ({}))) as {
          phone?: string;
          paused?: boolean;
          instance?: string;
        };
        if (!body.phone) return json({ ok: false, error: "missing_phone" }, 400);
        const paused = body.paused !== false; // default true
        const instance = body.instance || "soulmusic";
        const affected = await setPausedByPhone(body.phone, paused, instance);
        return json({ ok: true, paused, affected }, 200);
      },
    },
  },
});
