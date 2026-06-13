import { createFileRoute } from "@tanstack/react-router";
import { isSupabaseConfigured, listLeadsByEmail } from "@/lib/agent/state-store.server";

// Área do cliente: busca os pedidos por e-mail. GET /api/mi-pedido?email=...
// Sem senha — o "login" é informar o e-mail da compra.

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/mi-pedido")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const email = (new URL(request.url).searchParams.get("email") ?? "").trim();
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          return json({ ok: false, error: "email_invalido" }, 400);
        }
        if (!isSupabaseConfigured()) return json({ ok: false, error: "sin_base" }, 503);

        const rows = await listLeadsByEmail(email);
        const orders = rows.map((r) => ({
          nombre: r.nombre ?? null,
          estilo: r.estilo ?? null,
          opcion: r.opcion ?? null,
          letra: r.letra ?? null,
          status: (r.status as string) ?? "en_produccion",
          created_at: r.created_at ?? null,
        }));
        return json({ ok: true, orders }, 200);
      },
    },
  },
});
