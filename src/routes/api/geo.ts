import { createFileRoute } from "@tanstack/react-router";

// Detecta o país do visitante pelo header de geo do edge (Cloudflare/Vercel/etc).
// Sem API externa, sem rate-limit. Retorna { country: "MX" } (ISO-2) ou "".

export const Route = createFileRoute("/api/geo")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const h = request.headers;
        const country = (
          h.get("cf-ipcountry") ||
          h.get("x-vercel-ip-country") ||
          h.get("x-geo-country") ||
          h.get("x-country") ||
          ""
        ).toUpperCase();
        return new Response(JSON.stringify({ country }), {
          status: 200,
          headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
        });
      },
    },
  },
});
