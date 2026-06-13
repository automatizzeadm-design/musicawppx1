import process from "node:process";
import { createFileRoute } from "@tanstack/react-router";
import { isSupabaseConfigured, listLeadsRecent } from "@/lib/agent/state-store.server";

// Lista de leads pra aba interna de Follow-up. Protegida por ?key=CRON_SECRET.

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/leads")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET ?? "";
        const key = new URL(request.url).searchParams.get("key") ?? "";
        if (!secret || key !== secret) return json({ ok: false, error: "unauthorized" }, 401);
        if (!isSupabaseConfigured()) return json({ ok: false, error: "sin_base", leads: [] }, 200);
        const leads = await listLeadsRecent();
        return json({ ok: true, leads }, 200);
      },
    },
  },
});
