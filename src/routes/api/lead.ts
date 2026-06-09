import { createFileRoute } from "@tanstack/react-router";
import { saveLead } from "@/lib/agent/state-store.server";

// Salva o lead do funnel web /chat. POST { nombre, historia, estilo, letra, opcion, email }

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/lead")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const b = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        if (!b.email) return json({ ok: false, error: "missing_email" }, 400);
        const ok = await saveLead({
          nombre: b.nombre ?? null,
          email: b.email,
          estilo: b.estilo ?? null,
          opcion: b.opcion ?? null,
          historia: b.historia ?? null,
          letra: b.letra ?? null,
        });
        return json({ ok }, ok ? 200 : 500);
      },
    },
  },
});
