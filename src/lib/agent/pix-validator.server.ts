import { getAgentConfig } from "./config.server";
import { visionAnalyze } from "./openai.server";
import type { OptionChoice, PixValidationResult } from "./types";

// Valida comprovante de Pix usando visão (OpenAI). Devolve veredito
// estruturado pra o orquestrador decidir aprovar ou pedir correção.
//
// Limite conhecido: comprovantes podem ser editados/falsificados. Esta
// validação visual reduz fraude mas não elimina. Pra produção real,
// cruzar com extrato ou usar gateway com Pix.

interface ValidatePixOptions {
  base64: string;
  mime: string;
  choice: OptionChoice;
}

export async function validatePixReceipt(opts: ValidatePixOptions): Promise<PixValidationResult> {
  const { base64, mime, choice } = opts;
  const config = getAgentConfig();

  // Se o cliente ainda não escolheu, não dá pra validar valor.
  if (!choice) {
    return {
      approved: false,
      reason: "Cliente ainda não escolheu uma opção; preciso saber o valor esperado.",
      details: {},
    };
  }

  const expectedValor = choice === "musica" ? config.business.preco_musica : config.business.preco_musica_site;
  const expectedNumber = choice === "musica" ? config.business.preco_musica_valor : config.business.preco_musica_site_valor;
  const today = new Date().toISOString().slice(0, 10);

  const prompt = `Você é um validador de comprovantes de pagamento Pix. Analise a imagem e responda APENAS em JSON com a estrutura abaixo. Não escreva nada antes ou depois do JSON.

Verifique:
1. **status**: o comprovante deve indicar pagamento CONCLUÍDO/EFETUADO. Status como "agendado", "em processamento" ou "pendente" → reprovar.
2. **valor**: deve ser exatamente ${expectedValor} (R$ ${expectedNumber.toFixed(2).replace(".", ",")}). Tolerância máxima ±0,01.
3. **favorecido/chave**: deve corresponder a "${config.business.dados_recebedor}" OU à chave "${config.business.chave_pix}".
4. **data**: deve ser recente (mesmo dia da consulta, hoje é ${today}). Comprovantes antigos (mais de 1 dia) → reprovar.

Responda em JSON nesta estrutura exata:
{
  "status_ok": true|false,
  "valor_ok": true|false,
  "favorecido_ok": true|false,
  "data_ok": true|false,
  "detected_amount": "string com o valor lido (R$ X,XX) ou ''",
  "detected_recipient": "string com o favorecido/chave lido ou ''",
  "detected_status": "string curta com o status detectado",
  "detected_date": "string com a data lida ou ''",
  "reason_if_invalid": "uma frase curta dizendo o que está errado, ou '' se tudo OK"
}

Se a imagem NÃO for um comprovante Pix legível (foto borrada, print de outra coisa, screenshot cortado), preencha tudo false e explique em reason_if_invalid.`;

  const raw = await visionAnalyze({
    apiKey: config.openai_api_key,
    model: config.vision_model,
    base64,
    mime,
    prompt,
    maxTokens: 400,
  });

  if (!raw) {
    return {
      approved: false,
      reason: "Não consegui analisar a imagem agora — pode mandar de novo?",
      details: {},
    };
  }

  // Extrai JSON do output (LLM as vezes envolve em ```json)
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      approved: false,
      reason: "Não consegui ler o comprovante. Pode mandar uma imagem mais nítida?",
      details: {},
    };
  }

  let parsed: Record<string, unknown> = {};
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return {
      approved: false,
      reason: "Não consegui ler o comprovante direito. Pode mandar de novo?",
      details: {},
    };
  }

  const details = {
    status_ok: Boolean(parsed.status_ok),
    valor_ok: Boolean(parsed.valor_ok),
    favorecido_ok: Boolean(parsed.favorecido_ok),
    data_ok: Boolean(parsed.data_ok),
    detected_amount: String(parsed.detected_amount ?? ""),
    detected_recipient: String(parsed.detected_recipient ?? ""),
    detected_status: String(parsed.detected_status ?? ""),
    detected_date: String(parsed.detected_date ?? ""),
  };

  const allOk = details.status_ok && details.valor_ok && details.favorecido_ok && details.data_ok;
  const reason = allOk ? undefined : String(parsed.reason_if_invalid ?? buildFailureReason(details, expectedValor));

  return {
    approved: allOk,
    reason,
    details,
  };
}

function buildFailureReason(d: PixValidationResult["details"], expected: string): string {
  if (d.status_ok === false) return `Status do comprovante não está como concluído (detectado: ${d.detected_status || "?"}).`;
  if (d.valor_ok === false) return `Valor não confere — esperado ${expected}, detectado ${d.detected_amount || "?"}.`;
  if (d.favorecido_ok === false) return `Favorecido não confere — detectado: ${d.detected_recipient || "?"}.`;
  if (d.data_ok === false) return `Data do comprovante não é de hoje — detectado: ${d.detected_date || "?"}.`;
  return "Não consegui validar o comprovante.";
}
