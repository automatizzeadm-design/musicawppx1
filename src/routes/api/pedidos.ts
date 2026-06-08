import process from "node:process";
import { createFileRoute } from "@tanstack/react-router";
import {
  isSupabaseConfigured,
  listOrders,
  markProduced,
  stateKey,
} from "@/lib/agent/state-store.server";

// API da aba Pedidos. Protegida pela chave admin (CRON_SECRET), passada em
// ?key=. Lista pedidos pagos (Pix aprovado) e permite marcar como produzido.

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

export const Route = createFileRoute("/api/pedidos")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!authorized(request)) return json({ ok: false, error: "unauthorized" }, 401);
        if (!isSupabaseConfigured()) {
          return json({ ok: false, error: "supabase_nao_configurado", orders: [] }, 200);
        }
        const states = await listOrders();
        const orders = states.map((s) => ({
          id: stateKey(s.instance, s.phone),
          phone: s.phone,
          customer_name: s.customer_name ?? null,
          choice: s.choice,
          story: s.story,
          letra: s.letra ?? null,
          produced: s.produced,
          updated_at: s.updated_at,
        }));
        return json({ ok: true, orders }, 200);
      },
      POST: async ({ request }) => {
        if (!authorized(request)) return json({ ok: false, error: "unauthorized" }, 401);
        const body = (await request.json().catch(() => ({}))) as { id?: string };
        if (!body.id) return json({ ok: false, error: "missing_id" }, 400);
        const ok = await markProduced(body.id);
        return json({ ok }, ok ? 200 : 404);
      },
    },
  },
});
