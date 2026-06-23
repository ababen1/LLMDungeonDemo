/**
 * @param {import('../llmAdapter.js').LLMCompleteRequest} request
 * @param {{ apiKey: string, model: string, baseUrl: string }} config
 */
export async function complete(request, config) {
  if (!config.baseUrl) {
    throw new Error('VITE_LLM_BASE_URL is required for generic provider');
  }

  const start = performance.now();
  const bodyTemplate = {
    model: config.model,
    messages: request.messages,
    temperature: request.temperature,
    max_tokens: request.maxTokens,
    seed: request.seed,
  };

  const response = await fetch(config.baseUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: config.apiKey ? `Bearer ${config.apiKey}` : '',
    },
    body: JSON.stringify(bodyTemplate),
    signal: request.signal,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Generic API error ${response.status}: ${errText}`);
  }

  const raw = await response.json();
  const content =
    raw.choices?.[0]?.message?.content ??
    raw.content?.[0]?.text ??
    raw.output ??
    '';

  return {
    content,
    raw,
    latencyMs: Math.round(performance.now() - start),
  };
}

export const supportsSeed = true;
export const name = 'generic';
