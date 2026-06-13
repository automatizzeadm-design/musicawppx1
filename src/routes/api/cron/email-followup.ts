import process from "node:process";
import { createFileRoute } from "@tanstack/react-router";
import {
  isSupabaseConfigured,
  listEmailFollowupCandidates,
  markEmailFollowupSentById,
} from "@/lib/agent/state-store.server";
import { promoFollowupHtml, sendEmail } from "@/lib/email.server";

// Cron de follow-up por e-mail. Chamado periodicamente (pg_cron):
//   GET /api/cron/email-followup?key=CRON_SECRET
// Manda a promo de $5 pra quem deixou o e-mail, NÃO comprou, e já passou
// FOLLOWUP_MIN minutos. Marca email_followup_sent pra não repetir.

const FOLLOWUP_MIN = 20;

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/cron/email-followup")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const secret = process.env.CRON_SECRET ?? "";
        const key = new URL(request.url).searchParams.get("key") ?? "";
        if (!secret || key !== secret) return json({ ok: false, error: "unauthorized" }, 401);

        const promoUrl = process.env.PROMO_CHECKOUT_URL ?? "";
        const hasResend = Boolean(process.env.RESEND_API_KEY);
        if (!isSupabaseConfigured() || !hasResend || !promoUrl) {
          return json(
            {
              ok: false,
              error: "nao_configurado",
              needs: { supabase: isSupabaseConfigured(), resend: hasResend, promo_url: Boolean(promoUrl) },
            },
            200,
          );
        }

        const cutoff = new Date(Date.now() - FOLLOWUP_MIN * 60000).toISOString();
        const candidates = await listEmailFollowupCandidates(cutoff);
        let sent = 0;

        for (const c of candidates) {
          const email = String(c.email ?? "");
          const id = String(c.id ?? "");
          if (!email || !id) continue;
          const ok = await sendEmail({
            to: email,
            subject: `🎵 ${c.nombre ? String(c.nombre) + ", " : ""}tu canción te espera — oferta especial $5`,
            html: promoFollowupHtml(String(c.nombre ?? ""), promoUrl),
          });
          if (ok) {
            await markEmailFollowupSentById(id);
            sent++;
          }
        }

        return json({ ok: true, checked: candidates.length, sent }, 200);
      },
    },
  },
});
