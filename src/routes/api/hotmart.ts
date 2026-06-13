import process from "node:process";
import { createFileRoute } from "@tanstack/react-router";
import { markLeadPaid } from "@/lib/agent/state-store.server";

// Webhook (Postback) da Hotmart. Quando uma compra é aprovada, a Hotmart
// chama POST /api/hotmart e a gente marca o lead (pelo e-mail) como pago.
// Segurança: confere o hottok (token do webhook) contra HOTMART_TOKEN.

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractEmail(b: any): string {
  return (
    b?.data?.buyer?.email ||
    b?.data?.purchase?.buyer?.email ||
    b?.buyer?.email ||
    b?.data?.subscriber?.email ||
    b?.email ||
    ""
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function isApproved(b: any): boolean {
  const ev = String(b?.event ?? "").toUpperCase();
  const st = String(b?.data?.purchase?.status ?? b?.status ?? b?.purchase_status ?? "").toUpperCase();
  return (
    ev.includes("APPROVED") ||
    ev.includes("COMPLETE") ||
    st === "APPROVED" ||
    st === "COMPLETE" ||
    st === "COMPLETED"
  );
}

export const Route = createFileRoute("/api/hotmart")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = process.env.HOTMART_TOKEN ?? "";
        const url = new URL(request.url);
        const raw = await request.text();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let body: any = {};
        try {
          body = JSON.parse(raw);
        } catch {
          body = Object.fromEntries(new URLSearchParams(raw).entries());
        }

        const hottok =
          request.headers.get("x-hotmart-hottok") || body?.hottok || url.searchParams.get("hottok") || "";
        if (token && hottok !== token) {
          return json({ ok: false, error: "unauthorized" }, 401);
        }

        if (!isApproved(body)) return json({ ok: true, ignored: "not_approved" }, 200);

        const email = extractEmail(body);
        if (!email) return json({ ok: true, ignored: "no_email" }, 200);

        const affected = await markLeadPaid(email);
        return json({ ok: true, affected }, 200);
      },
    },
  },
});
