import process from "node:process";

// Server-only config do agente. Lê env vars dentro da função pra
// funcionar em Cloudflare Workers (env binds em request time).

export interface BusinessConfig {
  preco_musica: string;
  preco_musica_site: string;
  prazo_entrega: string;
  chave_pix: string;
  dados_recebedor: string;
  /** Valor numérico da opção 1 (pra validar Pix automaticamente) */
  preco_musica_valor: number;
  /** Valor numérico da opção 2 */
  preco_musica_site_valor: number;
}

export interface AgentConfig {
  openai_api_key: string;
  openai_model: string;
  vision_model: string;
  /** Define quantas msgs do histórico mantemos por conversa. */
  max_history: number;
  business: BusinessConfig;
}

function parseValor(s: string | undefined, fallback: number): number {
  if (!s) return fallback;
  const clean = s.replace(/[^\d,.]/g, "").replace(",", ".");
  const n = Number(clean);
  return Number.isFinite(n) ? n : fallback;
}

export function getAgentConfig(): AgentConfig {
  const business: BusinessConfig = {
    preco_musica: process.env.PRECO_MUSICA ?? "R$ 19,90",
    preco_musica_site: process.env.PRECO_MUSICA_SITE ?? "R$ 29,90",
    prazo_entrega: process.env.PRAZO_ENTREGA ?? "em até 2 horas",
    chave_pix: process.env.CHAVE_PIX ?? "andreyurifurtado1@gmail.com",
    dados_recebedor: process.env.DADOS_RECEBEDOR ?? "Andre Yuri Furtado",
    preco_musica_valor: parseValor(process.env.PRECO_MUSICA, 19.9),
    preco_musica_site_valor: parseValor(process.env.PRECO_MUSICA_SITE, 29.9),
  };

  return {
    openai_api_key: process.env.OPENAI_API_KEY ?? "",
    openai_model: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    vision_model: process.env.VISION_MODEL ?? "gpt-4o-mini",
    max_history: Number(process.env.MAX_HISTORY ?? 30),
    business,
  };
}
