import { createFileRoute } from "@tanstack/react-router";
import { getAgentConfig } from "@/lib/agent/config.server";
import { chatComplete } from "@/lib/agent/openai.server";

// Gera a LETRA (em espanhol) pro funnel web /chat. POST { nombre, historia, estilo }

function json(data: unknown, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/letra")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json().catch(() => ({}))) as {
          nombre?: string;
          historia?: string;
          estilo?: string;
        };
        if (!body.historia) return json({ ok: false, error: "missing_historia" }, 400);

        const config = getAgentConfig();
        const systemPrompt =
          `Eres un compositor profesional de canciones personalizadas. Escribe SOLO la LETRA (texto) ` +
          `de una canción en español neutro latinoamericano, basada en la historia del cliente.\n` +
          `- Estilo musical: ${body.estilo ?? "balada romántica"}.\n` +
          `- Estructura: [Estrofa 1], [Estribillo], [Estrofa 2], [Estribillo final].\n` +
          `- Usa los nombres y detalles reales de la historia. Que sea emotiva y específica, sin clichés vacíos.\n` +
          `- NUNCA copies letras de canciones existentes. No agregues explicaciones ni comentarios, solo la letra.`;

        let letra = "";
        try {
          letra = await chatComplete({
            apiKey: config.openai_api_key,
            model: config.openai_model,
            systemPrompt,
            messages: [
              {
                role: "user",
                content: `Historia: ${body.historia}\nEstilo: ${body.estilo ?? ""}\nNombre de quien regala: ${body.nombre ?? ""}`,
              },
            ],
            maxTokens: 700,
            temperature: 0.85,
          });
        } catch (e) {
          console.error("[letra] LLM error:", e instanceof Error ? e.message : e);
          return json({ ok: false, error: "llm" }, 500);
        }
        if (!letra) return json({ ok: false, error: "empty" }, 500);
        return json({ ok: true, letra }, 200);
      },
    },
  },
});
