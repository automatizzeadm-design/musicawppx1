// Tipos compartilhados do agente. Sem código server-only — pode ser
// importado pelo client se algum dia for útil.

export type AgentStage =
  | "abertura"
  | "como_funciona"
  | "prova_social"
  | "coleta_historia"
  | "geracao_letra"
  | "oferta"
  | "pagamento"
  | "entrega"
  | "concluido"
  | "humano";

export type OptionChoice = "musica" | "musica_site" | null;

export interface CollectedStory {
  homenageado_nome?: string;
  onde_se_conheceram?: string;
  filhos?: string;
  momento_marcante?: string;
  detalhes_extra?: string;
  estilo?: string;
}

export interface ConversationState {
  /** WhatsApp number (digits only, E.164 sem +) */
  phone: string;
  /** Instance name on Evolution that owns the conversation */
  instance: string;
  /** Nome de quem está no WhatsApp (cliente) */
  customer_name?: string;
  /** Etapa atual do fluxo */
  stage: AgentStage;
  /** Histórico de mensagens (mais recente por último). Cap em N msgs. */
  history: ChatMessage[];
  /** Coleta de história pra letra */
  story: CollectedStory;
  /** Letra final aprovada (se já gerada) */
  letra?: string;
  /** Quantos refacts de letra já fizemos */
  letra_refacts: number;
  /** Opção escolhida na oferta */
  choice: OptionChoice;
  /** Tentativas de envio de comprovante (pra escalar humano após N tentativas inválidas) */
  pix_attempts: number;
  /** Pix aprovado? */
  pix_approved: boolean;
  /** Já enviamos os áudios de exemplo (prova social)? Evita reenvio. */
  examples_sent: boolean;
  /** Pedido já registrado/notificado pro dono (após Pix)? Evita duplicar. */
  order_notified: boolean;
  /** Agente pausado (handoff manual após pedido pago). Para de responder. */
  paused: boolean;
  /** Pedido já produzido/entregue por você (marcado na aba Pedidos). */
  produced: boolean;
  /** ISO da última mensagem RECEBIDA do cliente (base pros follow-ups). */
  last_inbound_at: string;
  /** Quantos follow-ups já mandamos desde a última resposta do cliente (0-3). */
  followups_sent: number;
  /** Buffer de mensagens recebidas aguardando o debounce (agrupa rajadas). */
  buffer: BufferedMessage[];
  /** Nota de sistema pendente (ex: veredito do Pix) pra incluir na próxima resposta. */
  pending_note?: string;
  /** Timestamp da última mensagem */
  updated_at: string;
}

export interface BufferedMessage {
  /** messageId do provider — usado como token de "última mensagem" no debounce */
  id: string;
  /** texto já pré-processado (transcrição/visão aplicadas) */
  text: string;
}

export interface ChatMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  /** Pra mensagens de "tool" do OpenAI */
  tool_call_id?: string;
  /** Pra LLM calls com tool_calls */
  tool_calls?: ToolCall[];
  /** Tipo de mídia recebida (audio/image/...) — informativo */
  media_type?: string;
}

export interface ToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface PixValidationResult {
  approved: boolean;
  reason?: string;
  details: {
    status_ok?: boolean;
    valor_ok?: boolean;
    favorecido_ok?: boolean;
    data_ok?: boolean;
    detected_amount?: string;
    detected_recipient?: string;
    detected_status?: string;
    detected_date?: string;
  };
}

export interface EvolutionMessagePayload {
  /** key.id da mensagem (provider message id) */
  messageId: string;
  /** key.fromMe — true se a mensagem é nossa */
  fromMe: boolean;
  /** Número limpo, só dígitos */
  phone: string;
  /** Nome do contato (pushName) */
  pushName: string;
  /** Nome da instância */
  instance: string;
  /** Conteúdo de texto direto, se houver */
  text: string;
  /** Tipo de mídia, se for mídia */
  mediaType: "audio" | "image" | "video" | "document" | "sticker" | null;
  /** Mimetype da mídia */
  mediaMime?: string;
  /** Caption da mídia */
  caption?: string;
  /** É grupo (skip) */
  isGroup: boolean;
}
