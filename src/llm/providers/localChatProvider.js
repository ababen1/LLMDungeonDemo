/**
 * Local network chat API: POST { model, input } to a /api/v1/chat/ endpoint.
 * @param {import('../llmAdapter.js').LLMCompleteRequest} request
 * @param {{ apiKey?: string, model: string, baseUrl?: string|null }} config
 */
export async function complete(request, config) {
  if (!config.baseUrl) {
    throw new Error('VITE_LLM_BASE_URL is required for local provider');
  }

  const start = performance.now();
  const url = config.baseUrl.replace(/\/$/, '');
  const input = messagesToInput(request.messages);

  const body = {
    model: config.model,
    input,
  };

  const headers = { 'Content-Type': 'application/json' };
  if (config.apiKey) {
    headers.Authorization = `Bearer ${config.apiKey}`;
  }

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: request.signal,
    });
  } catch (err) {
    const hint =
      url.startsWith('http') && !url.includes('localhost') && !url.includes('127.0.0.1')
        ? ' Direct LAN URLs are blocked by browser CORS. In dev, remove VITE_LLM_BASE_URL from .env to use the Vite proxy (/api/v1/chat/), or enable CORS on the LLM server.'
        : ' Check that the LLM server is running and VITE_LOCAL_LLM_PROXY_TARGET is set in .env (see .env.example).';
    throw new Error(`Local LLM unreachable (${err instanceof Error ? err.message : 'fetch failed'}).${hint}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Local LLM API error ${response.status}: ${errText}`);
  }

  const raw = await response.json();
  const content = extractContent(raw);

  if (!content) {
    throw new Error(`Local LLM API returned no text. Response: ${JSON.stringify(raw).slice(0, 500)}`);
  }

  return {
    content,
    raw,
    latencyMs: Math.round(performance.now() - start),
  };
}

/**
 * @param {import('../llmAdapter.js').LLMMessage[]} messages
 */
function messagesToInput(messages) {
  return messages
    .map((m) => {
      const label = m.role.charAt(0).toUpperCase() + m.role.slice(1);
      return `${label}:\n${m.content}`;
    })
    .join('\n\n');
}

function extractContent(raw) {
  if (typeof raw === 'string') return raw;
  if (!raw || typeof raw !== 'object') return '';

  if (Array.isArray(raw.output)) {
    const messageParts = raw.output
      .filter((item) => item?.type === 'message' && typeof item.content === 'string')
      .map((item) => item.content.trim())
      .filter(Boolean);
    if (messageParts.length > 0) {
      return messageParts.join('\n');
    }

    const nonReasoning = raw.output
      .filter((item) => item?.type !== 'reasoning' && typeof item.content === 'string')
      .map((item) => item.content.trim())
      .filter(Boolean);
    if (nonReasoning.length > 0) {
      return nonReasoning.join('\n');
    }

    const anyContent = raw.output
      .filter((item) => typeof item?.content === 'string')
      .map((item) => item.content.trim())
      .filter(Boolean);
    if (anyContent.length > 0) {
      return anyContent[anyContent.length - 1];
    }
  }

  if (typeof raw.output === 'string' && raw.output.length > 0) {
    return raw.output;
  }

  const candidates = [
    raw.response,
    raw.text,
    raw.content,
    raw.result,
    raw.choices?.[0]?.message?.content,
    raw.choices?.[0]?.text,
    raw.data?.output,
    raw.data?.text,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.length > 0) return c;
  }

  return '';
}

export const supportsSeed = false;
export const requiresApiKey = false;
export const name = 'local';
