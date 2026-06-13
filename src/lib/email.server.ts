import process from "node:process";

// Envio de e-mail via Resend (resend.com). Precisa de RESEND_API_KEY e, de
// preferência, um remetente verificado em FROM_EMAIL.

export async function sendEmail(opts: { to: string; subject: string; html: string }): Promise<boolean> {
  const key = process.env.RESEND_API_KEY ?? "";
  const from = process.env.FROM_EMAIL ?? "CreaTuCanción <onboarding@resend.dev>";
  if (!key) {
    console.error("[email] RESEND_API_KEY não configurada");
    return false;
  }
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({ from, to: opts.to, subject: opts.subject, html: opts.html }),
      signal: AbortSignal.timeout(15000),
    });
    if (!resp.ok) {
      console.error("[email] envio falhou:", resp.status, (await resp.text().catch(() => "")).slice(0, 200));
      return false;
    }
    return true;
  } catch (e) {
    console.error("[email] erro:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** E-mail de follow-up com promoção pra quem não comprou. */
export function promoFollowupHtml(nombre: string, promoUrl: string): string {
  const hi = nombre ? `Hola ${nombre}` : "Hola";
  return `<!DOCTYPE html><html><body style="margin:0;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
  <div style="max-width:480px;margin:0 auto;padding:24px;">
    <div style="background:#fff;border-radius:16px;padding:28px;border:1px solid #f3d4e8;">
      <p style="font-size:22px;font-weight:800;margin:0 0 4px;">🎶 CreaTu<span style="color:#ec008c;">Canción</span></p>
      <h1 style="font-size:20px;margin:18px 0 8px;">${hi}, ¡tu canción te está esperando! 🎵</h1>
      <p style="font-size:15px;line-height:1.5;color:#4b5563;margin:0 0 16px;">
        Vimos que empezaste a crear tu canción personalizada pero no la terminaste.
        Para que no te quedes sin ella, te damos una <b>oferta especial</b>:
      </p>
      <p style="text-align:center;margin:18px 0;">
        <span style="text-decoration:line-through;color:#ef4444;font-size:18px;">$9</span>
        <span style="color:#16a34a;font-weight:800;font-size:30px;margin-left:8px;">$5</span>
        <br><span style="font-size:13px;color:#6b7280;">solo por tiempo limitado</span>
      </p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${promoUrl}" style="background:#ec008c;color:#fff;text-decoration:none;font-weight:700;font-size:16px;padding:14px 28px;border-radius:12px;display:inline-block;">
          Crear mi canción por $5 🎁
        </a>
      </p>
      <p style="font-size:13px;color:#9ca3af;text-align:center;margin:16px 0 0;">
        Una canción única, hecha solo para esa persona especial. 💜
      </p>
    </div>
  </div></body></html>`;
}
