import { getAgentConfig } from "./config.server";
import { chatComplete, transcribeAudio } from "./openai.server";
import { validatePixReceipt } from "./pix-validator.server";
import { buildStateContext, buildSystemPrompt } from "./prompt.server";
import {
  inMemoryStateStore,
  newConversationState,
  stateKey,
  trimHistory,
  type StateStore,
} from "./state-store.server";
import { getMediaBase64, sendText } from "../api/evolution.server";
import type {
  ChatMessage,
  ConversationState,
  EvolutionMessagePayload,
  OptionChoice,
} from "./types";

// ───────────────────────────────────────────────────────────────────────
// HEURÍSTICAS DE EXTRAÇÃO DE ESTADO
// O LLM cuida da resposta. Aqui detectamos sinais simples na mensagem
// do cliente pra atualizar `stage`, `customer_name`, `choice` etc.
// É a forma mais barata; pra robustez total, depois dá pra trocar por
// tool-calling explícito.
// ───────────────────────────────────────────────────────────────────────

function detectChoice(text: string): OptionChoice {
  const t = text.toLowerCase();
  if (/\bop[cç][aã]o\s*2\b|\bopcao\s*2\b|musica\s*\+\s*site|m[uú]sica\s*\+\s*site|com\s*site|29[.,]?9/i.test(text)) return "musica_site";
  if (/\bop[cç][aã]o\s*1\b|s[oó]\s*(a\s*)?m[uú]sica|so\s*musica|19[.,]?9/i.test(text)) return "musica";
  return null;
}

function looksLikeName(text: string): boolean {
  // Heurística: mensagem curta com palavras capitalizáveis e sem perguntas
  const trimmed = text.trim();
  if (trimmed.length < 2 || trimmed.length > 60) return false;
  if (/[?!]/.test(trimmed)) return false;
  // Tem alguma letra
  return /[a-záàâãéêíóôõúç]/i.test(trimmed);
}

function extractFirstName(text: string): string | undefined {
  const trimmed = text.trim();
  // "meu nome é Yuri" / "sou Yuri" / "Yuri"
  const named = trimmed.match(/(?:me\s*chamo|meu\s*nome\s*[ée]|sou|aqui\s*[ée])\s+([A-Za-zÀ-ÿ]+)/i);
  if (named?.[1]) return named[1];
  // Fallback: primeira palavra
  const first = trimmed.split(/\s+/)[0];
  return first?.length >= 2 ? first.replace(/[.,!?]/g, "") : undefined;
}

function detectApproval(text: string): boolean {
  return /\b(aprov|gost|amei|adorei|perfeit|maravilh|t[aá]\s*[oô]timo|ficou\s*[oô]timo|ficou\s*linda|ficou\s*lindo|pode\s*mandar)\b/i.test(text);
}

function detectChangeRequest(text: string): boolean {
  return /\b(muda|troca|ajeit|refaz|n[aã]o\s*gostei|tem\s*como\s*mudar|outra\s*vers|tira|coloca|adapta)\b/i.test(text);
}

// ───────────────────────────────────────────────────────────────────────
// AVANÇO DE ETAPA
// Decide a próxima etapa com base no estado atual + mensagem do cliente.
// Não força — só sugere o próximo step pro LLM seguir.
// ───────────────────────────────────────────────────────────────────────

function nextStage(state: ConversationState, msg: string): ConversationState["stage"] {
  const s = state.stage;
  const lower = msg.toLowerCase();

  switch (s) {
    case "abertura":
      if (state.customer_name) return "como_funciona";
      return "abertura";
    case "como_funciona":
      if (/\b(sim|claro|pode|bora|manda|vai|quero|aceito)\b/.test(lower)) return "prova_social";
      return "como_funciona";
    case "prova_social":
      return "coleta_historia";
    case "coleta_historia":
      if (state.story.homenageado_nome && state.story.estilo && (state.story.momento_marcante || state.story.detalhes_extra)) {
        return "geracao_letra";
      }
      return "coleta_historia";
    case "geracao_letra":
      if (state.letra && detectApproval(msg)) return "oferta";
      return "geracao_letra";
    case "oferta":
      if (state.choice) return "pagamento";
      return "oferta";
    case "pagamento":
      if (state.pix_approved) return "entrega";
      return "pagamento";
    case "entrega":
      return "concluido";
    case "concluido":
    case "humano":
      return s;
  }
}

// ───────────────────────────────────────────────────────────────────────
// QUEBRA DE MENSAGEM EM BALÕES
// ───────────────────────────────────────────────────────────────────────

const MAX_CHUNKS = 4;

function splitReply(text: string): string[] {
  const t = (text ?? "").trim();
  if (!t) return [];
  if (t.length < 50) return [t];

  const parts = t.split(/\n\s*\n+/).map((s) => s.trim()).filter(Boolean);
  if (parts.length <= 1) return [t];
  if (parts.length > MAX_CHUNKS) {
    const head = parts.slice(0, MAX_CHUNKS - 1);
    const tail = parts.slice(MAX_CHUNKS - 1).join("\n\n");
    return [...head, tail];
  }
  return parts;
}

// Tempo de digitação simulado por chars (~35 cps), entre 1.5s e 8s
function computeTypingDelay(text: string): number {
  const chars = (text ?? "").length;
  const ms = Math.round(chars * (1000 / 35));
  return Math.max(1500, Math.min(8000, ms));
}

const INTER_MESSAGE_PAUSE_MS = 400;

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// ───────────────────────────────────────────────────────────────────────
// FLUXO PRINCIPAL
// ───────────────────────────────────────────────────────────────────────

interface HandleOptions {
  payload: EvolutionMessagePayload;
  store?: StateStore;
}

export async function handleIncoming({ payload, store = inMemoryStateStore }: HandleOptions): Promise<void> {
  const config = getAgentConfig();
  const key = stateKey(payload.instance, payload.phone);
  let state = (await store.get(key)) ?? newConversationState(payload.instance, payload.phone);

  // Pré-processa entrada: pode ser texto, áudio (transcreve), imagem (vision)
  let userText = payload.text?.trim();
  let visionAnnotation: string | undefined;

  if (payload.mediaType === "audio") {
    const b64 = await getMediaBase64({ instance: payload.instance, messageId: payload.messageId });
    if (b64) {
      const t = await transcribeAudio({ apiKey: config.openai_api_key, base64: b64, mime: payload.mediaMime ?? "audio/ogg" });
      if (t) userText = t;
      else userText = userText || "[áudio recebido — não consegui transcrever]";
    } else {
      userText = userText || "[áudio recebido — sem base64]";
    }
  }

  // Imagem na etapa de PAGAMENTO → tenta validar como comprovante Pix
  let pixValidationMessage: string | undefined;
  if (payload.mediaType === "image" && state.stage === "pagamento") {
    const b64 = await getMediaBase64({ instance: payload.instance, messageId: payload.messageId });
    if (b64) {
      const v = await validatePixReceipt({ base64: b64, mime: payload.mediaMime ?? "image/jpeg", choice: state.choice });
      if (v.approved) {
        state.pix_approved = true;
        state.stage = "entrega";
        pixValidationMessage = "VEREDITO DO SISTEMA: ✅ PIX APROVADO. Avance pra etapa de confirmação e entrega.";
      } else {
        state.pix_attempts += 1;
        pixValidationMessage = `VEREDITO DO SISTEMA: ❌ PIX INVÁLIDO. Motivo: ${v.reason ?? "não identificado"}. Tentativas: ${state.pix_attempts}.${state.pix_attempts >= 3 ? " Escale pra humano." : " Peça gentilmente pro cliente o que falta."}`;
      }
      userText = (userText ? userText + "\n" : "") + "[comprovante Pix enviado pelo cliente]";
    } else {
      userText = userText || "[imagem recebida — não consegui baixar]";
    }
  } else if (payload.mediaType === "image") {
    // Imagem fora da etapa de pagamento — descrever pra contexto
    const b64 = await getMediaBase64({ instance: payload.instance, messageId: payload.messageId });
    if (b64) {
      const { visionAnalyze } = await import("./openai.server");
      const desc = await visionAnalyze({
        apiKey: config.openai_api_key,
        model: config.vision_model,
        base64: b64,
        mime: payload.mediaMime ?? "image/jpeg",
        prompt: "Descreva esta imagem em 1-2 frases curtas em português. Foco: é um comprovante de pagamento? é uma foto pessoal? print de conversa?",
        maxTokens: 200,
      });
      if (desc) visionAnnotation = `[imagem recebida: ${desc}]`;
    }
    userText = (userText ? userText + "\n" : "") + (visionAnnotation ?? "[imagem recebida]");
  } else if (payload.caption && !userText) {
    userText = payload.caption;
  }

  if (!userText) {
    console.warn("[agent] mensagem sem texto utilizável, ignorando");
    return;
  }

  // ───────────────────────────────────────────────────────────────────────
  // BUFFER / DEBOUNCE
  // O cliente costuma mandar várias mensagens em rajada ("oi", "tudo bem?",
  // "queria uma música"). Em vez de responder cada uma, guardamos no buffer
  // e esperamos uma janela curta. Só a ÚLTIMA mensagem da rajada (a que
  // continua sendo a última depois do sleep) processa e responde — juntando
  // todos os textos. Padrão serverless: compara o id da última msg, sem timer
  // persistente. (Ver lição: comparar id/texto, não timestamp.)
  // ───────────────────────────────────────────────────────────────────────
  if (!state.buffer) state.buffer = [];
  state.buffer.push({ id: payload.messageId, text: userText });
  if (pixValidationMessage) state.pending_note = pixValidationMessage;
  state.updated_at = new Date().toISOString();
  await store.set(key, state);

  if (config.buffer_ms > 0) {
    await sleep(config.buffer_ms);
    const fresh = await store.get(key);
    if (!fresh) return;
    state = fresh;
    const last = state.buffer?.[state.buffer.length - 1];
    if (!last || last.id !== payload.messageId) {
      // Chegou mensagem nova depois da minha — ela vai responder pela rajada toda.
      return;
    }
  }

  // Sou a última da rajada: junto todos os textos e limpo o buffer.
  const buffered = state.buffer ?? [];
  userText = buffered.map((m) => m.text).join("\n").trim() || userText;
  state.buffer = [];
  const systemNote = state.pending_note;
  state.pending_note = undefined;

  // Atualiza estado a partir da mensagem do cliente (heurísticas)
  if (state.stage === "abertura" && !state.customer_name) {
    const name = extractFirstName(userText);
    if (name && looksLikeName(userText)) {
      state.customer_name = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
  }

  if (state.stage === "oferta" && !state.choice) {
    const c = detectChoice(userText);
    if (c) state.choice = c;
  }

  // Auto-coleta heurística simples da história
  if (state.stage === "coleta_historia") {
    if (!state.story.estilo) {
      const m = userText.match(/\b(rom[aâ]ntic[ao]|sertanej[oa]|gospel|pop|infantil|samba|forr[oó]|rock|mpb|funk|piseiro|country|fado|rep[aá]g[ao])\b/i);
      if (m) state.story.estilo = m[1];
    }
    // Tudo o que vem depois da intro vai pra detalhes (LLM organiza)
    state.story.detalhes_extra = (state.story.detalhes_extra ? state.story.detalhes_extra + " | " : "") + userText.slice(0, 500);
  }

  // Decide próxima etapa
  if (!state.pix_approved) {
    state.stage = nextStage(state, userText);
  }

  // Adiciona contexto da validação Pix ao prompt se relevante
  const extraSystemNote = systemNote ? `\n\n## NOTA DO SISTEMA\n${systemNote}` : "";

  // Monta histórico pra LLM
  const userMessage: ChatMessage = { role: "user", content: userText };
  const systemPrompt = buildSystemPrompt(config.business) + buildStateContext(state) + extraSystemNote;

  let reply: string;
  try {
    reply = await chatComplete({
      apiKey: config.openai_api_key,
      model: config.openai_model,
      systemPrompt,
      messages: [...state.history, userMessage],
      maxTokens: 700,
      temperature: 0.8,
    });
  } catch (e) {
    console.error("[agent] LLM error:", e instanceof Error ? e.message : e);
    reply = "Oi! Tive um probleminha aqui, pode mandar de novo? 🙏";
  }

  if (!reply) {
    reply = "Desculpa, tive um soluço aqui. Pode repetir? 💚";
  }

  // Atualiza estado: armazena também a letra se identificarmos
  if (state.stage === "geracao_letra" && !state.letra && reply.length > 100) {
    state.letra = reply;
  }

  state.history.push(userMessage);
  state.history.push({ role: "assistant", content: reply });
  trimHistory(state, config.max_history);
  state.updated_at = new Date().toISOString();
  await store.set(key, state);

  // Envia em chunks com "digitando..."
  const chunks = splitReply(reply);
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const delay = computeTypingDelay(chunk);
    await sendText({ instance: payload.instance, number: payload.phone, text: chunk, delay });
    if (i < chunks.length - 1) {
      await new Promise((r) => setTimeout(r, delay + INTER_MESSAGE_PAUSE_MS));
    }
  }
}
