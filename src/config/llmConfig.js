const GROQ_BASE_URL = 'https://api.groq.com/openai';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export function getLLMConfig() {
  const provider = import.meta.env.VITE_LLM_PROVIDER ?? 'groq';
  const baseUrl = import.meta.env.VITE_LLM_BASE_URL || (provider === 'groq' ? GROQ_BASE_URL : null);
  const model = import.meta.env.VITE_LLM_MODEL ?? (provider === 'groq' ? GROQ_MODEL : 'gpt-4o-mini');

  return {
    provider,
    apiKey: import.meta.env.VITE_LLM_API_KEY ?? '',
    model,
    baseUrl,
    seedSupported: provider === 'openai',
  };
}
