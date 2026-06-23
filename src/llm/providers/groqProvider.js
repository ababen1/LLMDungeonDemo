/**
 * Groq — OpenAI-compatible chat completions API.
 * @param {import('../llmAdapter.js').LLMCompleteRequest} request
 * @param {{ apiKey: string, model: string, baseUrl?: string|null }} config
 */
export async function complete(request, config) {
  const start = performance.now();
  const baseUrl = config.baseUrl || 'https://api.groq.com/openai';
  const url = `${baseUrl.replace(/\/$/, '')}/v1/chat/completions`;

  const body = {
    model: config.model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify(body),
    signal: request.signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401) {
      throw new Error('Set VITE_LLM_API_KEY in .env');
    }
    throw new Error(`Groq API error ${response.status}: ${errText}`);
  }

  const raw = await response.json();
  const content = raw.choices?.[0]?.message?.content ?? '';

  return {
    content,
    raw,
    latencyMs: Math.round(performance.now() - start),
  };
}

export const supportsSeed = false;
export const name = 'groq';
