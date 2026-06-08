import type { ConversationState } from "./types";

// Armazena estado de conversa por (instance, phone). Implementação atual:
// in-memory. Funciona em dev e em Cloudflare Worker enquanto a instância
// estiver viva, mas perde estado a cada cold-start ou deploy.
//
// Pra produção, troque por:
//   - Cloudflare KV / Durable Objects
//   - Supabase (cria tabela `agent_conversations`)
//   - Redis
// Mantenha a interface `StateStore` igual e injete a impl real.

export interface StateStore {
  get(key: string): Promise<ConversationState | null>;
  set(key: string, state: ConversationState): Promise<void>;
  delete(key: string): Promise<void>;
}

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

export function stateKey(instance: string, phone: string): string {
  return `${instance}::${phone}`;
}

export function newConversationState(instance: string, phone: string): ConversationState {
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
    buffer: [],
    updated_at: new Date().toISOString(),
  };
}

// Trim do histórico pra evitar explosão de tokens
export function trimHistory(state: ConversationState, max: number): void {
  if (state.history.length > max) {
    state.history = state.history.slice(state.history.length - max);
  }
}
