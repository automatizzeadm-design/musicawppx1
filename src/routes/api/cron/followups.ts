import process from "node:process";
import { createFileRoute } from "@tanstack/react-router";
import {
  getStateStore,
  isSupabaseConfigured,
  listFollowUpCandidates,
} from "@/lib/agent/state-store.server";
import { sendFollowUp } from "@/lib/agent/conversation.server";

// Cron de follow-ups. Chamado periodicamente (pg_cron do Lovable Cloud) em:
//   GET /api/cron/followups?key=CRON_SECRET
//
// Limiares medidos a partir da ÚLTIMA mensagem do cliente:
//   followups_sent 0 → 20 min  | 1 → 2 h | 2 → 6 h
// Quando o cliente responde, o webhook zera followups_sent e last_inbound_at.

const MIN = 60 * 1000;
const THRESHOLDS = [20 * MIN, 120 * MIN, 360 * MIN]; // 20min, 2h, 6h

function isDue(followupsSent: number, elapsedMs: number): boolean {
  if (followupsSent < 0 || followupsSent >= THRESHOLDS.length) return false;
  return elapsedMs >= THRESHOLDS[followupsSent];
}

export const Route = createFileRoute("/api/cron/followups")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET ?? "";
        const key = new URL(request.url).searchParams.get("key") ?? "";
        if (!secret || key !== secret) {
          return new Response(JSON.stringify({ ok: false, error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!isSupabaseConfigured()) {
          return new Response(
            JSON.stringify({ ok: false, error: "supabase_nao_configurado" }),
            { status: 503, headers: { "Content-Type": "application/json" } },
          );
        }

        const store = getStateStore();
        const candidates = await listFollowUpCandidates();
        const now = Date.now();
        let checked = 0;
        let sent = 0;

        for (const state of candidates) {
          checked++;
          const last = new Date(state.last_inbound_at).getTime();
          if (!Number.isFinite(last)) continue;
          if (isDue(state.followups_sent, now - last)) {
            const ok = await sendFollowUp(state, store);
            if (ok) sent++;
          }
        }

        return new Response(JSON.stringify({ ok: true, checked, sent }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
