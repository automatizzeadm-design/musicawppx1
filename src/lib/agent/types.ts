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
  /** Timestamp da última mensagem */
  updated_at: string;
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
