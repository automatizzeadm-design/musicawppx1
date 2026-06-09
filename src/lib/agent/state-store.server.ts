import process from "node:process";
import type { ConversationState } from "./types";

// Armazena estado de conversa por (instance, phone).
//
// Duas implementações:
//   - inMemoryStateStore: dev / fallback. Perde estado a cada cold-start.
//   - supabaseStateStore: persistente (Lovable Cloud / Supabase). NECESSÁRIO
//     pros follow-ups, porque o cron roda numa invocação separada do webhook
//     e precisa ler "quem não respondeu".
//
// getStateStore() escolhe automaticamente: se SUPABASE_URL +
// SUPABASE_SERVICE_ROLE_KEY estiverem setados, usa Supabase; senão in-memory.

export interface StateStore {
  get(key: string): Promise<ConversationState | null>;
  set(key: string, state: ConversationState): Promise<void>;
  delete(key: string): Promise<void>;
}

// ───────────────────────────────────────────────────────────────────────
// IN-MEMORY
// ───────────────────────────────────────────────────────────────────────

const memory = new Map<string, ConversationState>();

export const inMemoryStateStore: StateStore = {
  async get(key) {
    return memory.get(key) ?? null;
  },
  async set(key, state) {
    memory.set(key, state);
  },
  async delete(key) {
    memory.delete(key);
  },
};

// ───────────────────────────────────────────────────────────────────────
// SUPABASE (via REST, sem SDK — evita dependência extra)
// ───────────────────────────────────────────────────────────────────────

const TABLE = "agent_conversations";

function supabaseEnv(): { url: string; key: string } | null {
  // O Lovable reserva o prefixo SUPABASE_ pros secrets internos dele, então o
  // usuário NÃO consegue criar SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY. Usamos
  // AGENT_DB_* (criáveis) como nomes principais; mantemos os SUPABASE_* só
  // como fallback caso algum dia o Lovable exponha os internos.
  const url = (process.env.AGENT_DB_URL ?? process.env.SUPABASE_URL ?? "").replace(/\/+$/, "");
  const key =
    process.env.AGENT_DB_KEY ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_ROLE ??
    "";
  if (!url || !key) return null;
  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return supabaseEnv() !== null;
}

/** Faz uma leitura real na tabela pra confirmar credenciais + tabela existem. */
export async function checkDb(): Promise<{ ok: boolean; error?: string }> {
  const env = supabaseEnv();
  if (!env) return { ok: false, error: "sem AGENT_DB_URL/AGENT_DB_KEY" };
  try {
    const resp = await fetch(`${env.url}/rest/v1/${TABLE}?select=id&limit=1`, {
      headers: supabaseHeaders(env),
      signal: AbortSignal.timeout(8000),
    });
    if (resp.ok) return { ok: true };
    const body = (await resp.text().catch(() => "")).slice(0, 140);
    return { ok: false, error: `${resp.status} ${body}` };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

function supabaseHeaders(env: { key: string }) {
  return {
    "Content-Type": "application/json",
    apikey: env.key,
    Authorization: `Bearer ${env.key}`,
  };
}

function rowFromState(key: string, state: ConversationState) {
  return {
    id: key,
    instance: state.instance,
    phone: state.phone,
    stage: state.stage,
    state,
    last_inbound_at: state.last_inbound_at,
    followups_sent: state.followups_sent,
    pix_approved: state.pix_approved,
    updated_at: state.updated_at,
  };
}

export const supabaseStateStore: StateStore = {
  async get(key) {
    const env = supabaseEnv();
    if (!env) return null;
    try {
      const resp = await fetch(
        `${env.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(key)}&select=state`,
        { headers: supabaseHeaders(env), signal: AbortSignal.timeout(10000) },
      );
      if (!resp.ok) {
        console.error("[store] supabase get falhou:", resp.status, await resp.text().catch(() => ""));
        return null;
      }
      const rows = (await resp.json().catch(() => [])) as { state?: ConversationState }[];
      return rows[0]?.state ?? null;
    } catch (e) {
      console.error("[store] supabase get erro:", e instanceof Error ? e.message : e);
      return null;
    }
  },
  async set(key, state) {
    const env = supabaseEnv();
    if (!env) return;
    try {
      const resp = await fetch(`${env.url}/rest/v1/${TABLE}?on_conflict=id`, {
        method: "POST",
        headers: { ...supabaseHeaders(env), Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify(rowFromState(key, state)),
        signal: AbortSignal.timeout(10000),
      });
      if (!resp.ok) {
        console.error("[store] supabase set falhou:", resp.status, await resp.text().catch(() => ""));
      }
    } catch (e) {
      console.error("[store] supabase set erro:", e instanceof Error ? e.message : e);
    }
  },
  async delete(key) {
    const env = supabaseEnv();
    if (!env) return;
    try {
      await fetch(`${env.url}/rest/v1/${TABLE}?id=eq.${encodeURIComponent(key)}`, {
        method: "DELETE",
        headers: supabaseHeaders(env),
        signal: AbortSignal.timeout(10000),
      });
    } catch (e) {
      console.error("[store] supabase delete erro:", e instanceof Error ? e.message : e);
    }
  },
};

/**
 * Conversas ativas candidatas a follow-up: sem Pix aprovado, com menos de 3
 * follow-ups e fora de etapas terminais. O cron decide quais estão "vencidas"
 * pelo tempo. Só funciona com Supabase (in-memory não serve pro cron).
 */
export async function listFollowUpCandidates(): Promise<ConversationState[]> {
  const env = supabaseEnv();
  if (!env) return [];
  try {
    const query =
      `${env.url}/rest/v1/${TABLE}` +
      `?pix_approved=eq.false&followups_sent=lt.3` +
      `&stage=not.in.(entrega,concluido,humano)&select=state`;
    const resp = await fetch(query, { headers: supabaseHeaders(env), signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      console.error("[store] supabase listFollowUp falhou:", resp.status, await resp.text().catch(() => ""));
      return [];
    }
    const rows = (await resp.json().catch(() => [])) as { state?: ConversationState }[];
    return rows.map((r) => r.state).filter((s): s is ConversationState => Boolean(s));
  } catch (e) {
    console.error("[store] supabase listFollowUp erro:", e instanceof Error ? e.message : e);
    return [];
  }
}

/** Salva um lead do funnel web (/chat) na tabela `leads`. */
export async function saveLead(lead: Record<string, unknown>): Promise<boolean> {
  const env = supabaseEnv();
  if (!env) return false;
  try {
    const resp = await fetch(`${env.url}/rest/v1/leads`, {
      method: "POST",
      headers: { ...supabaseHeaders(env), Prefer: "return=minimal" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) console.error("[lead] save falhou:", resp.status, await resp.text().catch(() => ""));
    return resp.ok;
  } catch (e) {
    console.error("[lead] save erro:", e instanceof Error ? e.message : e);
    return false;
  }
}

/** Pedidos pagos (pix aprovado), mais recentes primeiro. Pra aba Pedidos. */
export async function listOrders(): Promise<ConversationState[]> {
  const env = supabaseEnv();
  if (!env) return [];
  try {
    const query = `${env.url}/rest/v1/${TABLE}?pix_approved=eq.true&select=state&order=updated_at.desc`;
    const resp = await fetch(query, { headers: supabaseHeaders(env), signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      console.error("[store] supabase listOrders falhou:", resp.status, await resp.text().catch(() => ""));
      return [];
    }
    const rows = (await resp.json().catch(() => [])) as { state?: ConversationState }[];
    return rows.map((r) => r.state).filter((s): s is ConversationState => Boolean(s));
  } catch (e) {
    console.error("[store] supabase listOrders erro:", e instanceof Error ? e.message : e);
    return [];
  }
}

/**
 * Pausa/despausa o bot pra um número. Casa pelo final do número (ignora o
 * prefixo DDI). Se não houver conversa ainda, cria uma já pausada (pré-bloqueio)
 * na instância informada. Retorna quantas conversas foram afetadas.
 */
export async function setPausedByPhone(
  phone: string,
  paused: boolean,
  defaultInstance: string,
): Promise<number> {
  const env = supabaseEnv();
  if (!env) return 0;
  const digits = phone.replace(/\D/g, "");
  if (!digits) return 0;
  const tail = digits.slice(-11); // DDD + número (BR), ignora DDI
  try {
    const resp = await fetch(`${env.url}/rest/v1/${TABLE}?phone=like.*${tail}&select=state`, {
      headers: supabaseHeaders(env),
      signal: AbortSignal.timeout(10000),
    });
    const rows = resp.ok ? ((await resp.json().catch(() => [])) as { state?: ConversationState }[]) : [];
    const states = rows.map((r) => r.state).filter((s): s is ConversationState => Boolean(s));
    if (states.length) {
      for (const s of states) {
        s.paused = paused;
        s.updated_at = new Date().toISOString();
        await supabaseStateStore.set(stateKey(s.instance, s.phone), s);
      }
      return states.length;
    }
    // Pré-bloqueio: cria conversa já pausada (garante DDI 55 se vier sem)
    const full = digits.length <= 11 ? `55${digits}` : digits;
    const s = newConversationState(defaultInstance, full);
    s.paused = paused;
    await supabaseStateStore.set(stateKey(defaultInstance, full), s);
    return 1;
  } catch (e) {
    console.error("[store] setPausedByPhone erro:", e instanceof Error ? e.message : e);
    return 0;
  }
}

/** Marca um pedido como produzido (botão na aba Pedidos). */
export async function markProduced(key: string): Promise<boolean> {
  const store = getStateStore();
  const state = await store.get(key);
  if (!state) return false;
  state.produced = true;
  state.updated_at = new Date().toISOString();
  await store.set(key, state);
  return true;
}

/** Escolhe a store conforme o ambiente (Supabase se configurado, senão memória). */
export function getStateStore(): StateStore {
  return isSupabaseConfigured() ? supabaseStateStore : inMemoryStateStore;
}

// ───────────────────────────────────────────────────────────────────────
// HELPERS
// ───────────────────────────────────────────────────────────────────────

export function stateKey(instance: string, phone: string): string {
  return `${instance}::${phone}`;
}

export function newConversationState(instance: string, phone: string): ConversationState {
  const now = new Date().toISOString();
  return {
    instance,
    phone,
    stage: "abertura",
    history: [],
    story: {},
    letra_refacts: 0,
    choice: null,
    pix_attempts: 0,
    pix_approved: false,
    examples_sent: false,
    order_notified: false,
    paused: false,
    produced: false,
    last_inbound_at: now,
    followups_sent: 0,
    buffer: [],
    updated_at: now,
  };
}

// Trim do histórico pra evitar explosão de tokens
export function trimHistory(state: ConversationState, max: number): void {
  if (state.history.length > max) {
    state.history = state.history.slice(state.history.length - max);
  }
}
