/**
 * @param {import('../llmAdapter.js').LLMCompleteRequest} request
 * @param {{ apiKey: string, model: string }} config
 */
export async function complete(request, config) {
  const start = performance.now();
  const url = 'https://api.anthropic.com/v1/messages';

  const systemMsg = request.system ?? request.messages.find((m) => m.role === 'system')?.content ?? '';
  const userMessages = request.messages.filter((m) => m.role !== 'system');

  const body = {
    model: config.model || 'claude-3-5-haiku-20241022',
    max_tokens: request.maxTokens,
    temperature: request.temperature,
    system: systemMsg,
    messages: userMessages.map((m) => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: m.content,
    })),
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
    signal: request.signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    if (response.status === 401) {
      throw new Error('Set VITE_LLM_API_KEY in .env');
    }
    throw new Error(`Anthropic API error ${response.status}: ${errText}`);
  }

  const raw = await response.json();
  const content = raw.content?.map((b) => b.text).join('') ?? '';

  return {
    content,
    raw,
    latencyMs: Math.round(performance.now() - start),
  };
}

export const supportsSeed = false;
export const name = 'anthropic';
