const GROQ_BASE_URL = 'https://api.groq.com/openai';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

/** Same-origin path in dev; proxied by Vite to VITE_LOCAL_LLM_PROXY_TARGET */
const LOCAL_CHAT_PROXY_PATH = '/api/v1/chat/';
const LOCAL_CHAT_MODEL = 'google/gemma-4-e4b';

const PROVIDER_DEFAULTS = {
  local: { model: LOCAL_CHAT_MODEL, requiresApiKey: false },
  groq: { baseUrl: GROQ_BASE_URL, model: GROQ_MODEL, requiresApiKey: true },
  openai: { baseUrl: null, model: 'gpt-4o-mini', requiresApiKey: true },
  anthropic: { baseUrl: null, model: 'claude-3-5-haiku-20241022', requiresApiKey: true },
  generic: { baseUrl: null, model: 'gpt-4o-mini', requiresApiKey: false },
};

function resolveLocalBaseUrl() {
  if (import.meta.env.VITE_LLM_BASE_URL) {
    return import.meta.env.VITE_LLM_BASE_URL;
  }
  if (import.meta.env.DEV) {
    return LOCAL_CHAT_PROXY_PATH;
  }
  return null;
}

export function getLLMConfig() {
  const provider = import.meta.env.VITE_LLM_PROVIDER ?? 'groq';
  const defaults = PROVIDER_DEFAULTS[provider] ?? PROVIDER_DEFAULTS.groq;

  let baseUrl = import.meta.env.VITE_LLM_BASE_URL || defaults.baseUrl || null;
  if (provider === 'local') {
    baseUrl = resolveLocalBaseUrl();
  }

  return {
    provider,
    apiKey: import.meta.env.VITE_LLM_API_KEY ?? '',
    model: import.meta.env.VITE_LLM_MODEL ?? defaults.model,
    baseUrl,
    seedSupported: provider === 'openai',
    requiresApiKey: defaults.requiresApiKey,
  };
}
