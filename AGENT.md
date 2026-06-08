# Agente — Sua Música Personalizada

Agente IA para WhatsApp da marca **Sua Música Personalizada** (músicas exclusivas como presente).

## Arquitetura

```
src/
├── lib/
│   ├── agent/
│   │   ├── types.ts                  → tipos compartilhados
│   │   ├── config.server.ts          → variáveis de negócio + env vars
│   │   ├── prompt.server.ts          → system prompt + contexto da conversa
│   │   ├── openai.server.ts          → chat / whisper / vision
│   │   ├── pix-validator.server.ts   → análise de comprovante Pix
│   │   ├── state-store.server.ts     → estado da conversa (in-memory por ora)
│   │   └── conversation.server.ts    → orquestrador principal
│   └── api/
│       ├── evolution.ts              → cliente public (UI dashboard)
│       └── evolution.server.ts       → cliente server-only (sendText / mídia)
└── routes/
    └── api/
        └── webhook/
            └── evolution.ts          → POST /api/webhook/evolution
```

## Como funciona

1. Cliente manda mensagem no WhatsApp.
2. Evolution API recebe e dispara webhook `POST /api/webhook/evolution`.
3. `extractPayload` interpreta o evento e devolve `EvolutionMessagePayload` (texto, áudio, imagem).
4. `handleIncoming` carrega/cria o `ConversationState` daquele número + instância.
5. Pré-processa:
   - Áudio → Whisper transcreve.
   - Imagem no estágio `pagamento` → vision valida comprovante Pix.
   - Imagem em outros estágios → vision descreve em 1-2 frases (contexto).
6. Heurísticas extraem `customer_name`, `choice`, dicas de `story` e avançam `stage`.
7. LLM (`gpt-4o-mini`) gera a resposta com system prompt + estado + histórico.
8. Resposta é quebrada em até 4 balões (`\n\n` separa) e enviada via Evolution com "digitando..." proporcional ao tamanho.

## Fluxo do prompt (8 etapas)

1. **Abertura** — gancho emocional + pegar nome.
2. **Como funciona** — explicação curta.
3. **Prova social** — confiança.
4. **Coleta da história** — perguntas naturais sobre homenageado, momento, estilo.
5. **Geração da letra** — letra inteira em um balão.
6. **Oferta** — Opção 1 (só música, R$ 19,90) vs Opção 2 (música + site, R$ 29,90).
7. **Pagamento (Pix)** — chave + valor + espera comprovante.
8. **Confirmação e entrega** — só após Pix validado.

## Validação de Pix

Quando o cliente envia uma imagem no estágio `pagamento`, `validatePixReceipt` chama Vision com instruções estruturadas e parseia JSON:

- `status_ok` — pagamento concluído (não agendado/pendente)
- `valor_ok` — bate com a opção escolhida (R$ 19,90 ou R$ 29,90)
- `favorecido_ok` — bate com `DADOS_RECEBEDOR` ou `CHAVE_PIX`
- `data_ok` — é de hoje

Se tudo OK → `pix_approved=true` e avança pro estágio `entrega`. Senão, conta tentativa. 3 tentativas inválidas → escalar humano.

## Setup

1. **Variáveis** — copie `.env.example` pra `.env` e preencha:
   - `OPENAI_API_KEY`
   - `EVOLUTION_API_URL`, `EVOLUTION_API_KEY`
   - Variáveis de negócio (preço, Pix, prazo, recebedor)

2. **Webhook na Evolution** — configure:
   ```
   URL:    https://musicawppx1.lovable.app/api/webhook/evolution
   Evento: MESSAGES_UPSERT (apenas)
   ```

3. **Teste rápido** — `GET /api/webhook/evolution` retorna `{ ok: true, message: ... }` se o endpoint estiver vivo.

## Limites conhecidos (TODO pra produção)

- **State store in-memory** — perde estado em cold-start/deploy. Trocar por Cloudflare KV, Durable Objects ou Supabase. Interface `StateStore` em `state-store.server.ts` é a injeção.
- **Idempotência de webhook** — Evolution retenta. Adicionar dedupe por `messageId` num KV.
- **Comprovante editado** — validação visual ajuda mas não é à prova de fraude. Pra volume, cruzar com extrato/gateway Pix.
- **Rate limit OpenAI** — sem cap por número. Atacante pode queimar conta. Adicionar contador por phone.
- **Áudio em grupo / fromMe** — já são ignorados no webhook.

## Variáveis de ambiente

| Var | Default | Onde |
|---|---|---|
| `OPENAI_API_KEY` | — (obrigatória) | Server |
| `OPENAI_MODEL` | `gpt-4o-mini` | Server |
| `VISION_MODEL` | `gpt-4o-mini` | Server |
| `EVOLUTION_API_URL` | — | Server |
| `EVOLUTION_API_KEY` | — | Server |
| `PRECO_MUSICA` | `R$ 19,90` | Server |
| `PRECO_MUSICA_SITE` | `R$ 29,90` | Server |
| `PRAZO_ENTREGA` | `em até 2 horas` | Server |
| `CHAVE_PIX` | `andreyurifurtado1@gmail.com` | Server |
| `DADOS_RECEBEDOR` | `Andre Yuri Furtado` | Server |
| `MAX_HISTORY` | `30` | Server |
| `BUFFER_MS` | `8000` | Server (debounce de rajada; 0 desliga) |
| `EXEMPLOS_AUDIO_URLS` | — | Server (URLs de áudio p/ prova social, vírgula) |
| `AGENT_DB_URL` | — | Server (Supabase URL — persistência) |
| `AGENT_DB_KEY` | — | Server (Supabase service_role — persistência) |
| `CRON_SECRET` | — | Server (protege `/api/cron/followups`) |
| `VITE_EVOLUTION_API_URL` | — | Client (dashboard) |
| `VITE_EVOLUTION_API_KEY` | — | Client (dashboard) |
