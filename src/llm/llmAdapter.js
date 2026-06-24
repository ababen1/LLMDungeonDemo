import * as localChatProvider from './providers/localChatProvider.js';
import * as groqProvider from './providers/groqProvider.js';
import * as openaiProvider from './providers/openaiProvider.js';
import * as anthropicProvider from './providers/anthropicProvider.js';
import * as genericRestProvider from './providers/genericRestProvider.js';

/**
 * @typedef {'system'|'user'|'assistant'} LLMRole
 * @typedef {{ role: LLMRole, content: string }} LLMMessage
 *
 * @typedef {Object} LLMCompleteRequest
 * @property {LLMMessage[]} messages
 * @property {number} temperature
 * @property {number} maxTokens
 * @property {number} [seed]
 * @property {string} [system]
 * @property {AbortSignal} [signal]
 *
 * @typedef {Object} LLMCompleteResponse
 * @property {string} content
 * @property {object} raw
 * @property {number} latencyMs
 *
 * @typedef {Object} LLMAdapter
 * @property {(req: LLMCompleteRequest) => Promise<LLMCompleteResponse>} complete
 * @property {boolean} supportsSeed
 * @property {string} name
 */

const PROVIDERS = {
  local: localChatProvider,
  groq: groqProvider,
  openai: openaiProvider,
  anthropic: anthropicProvider,
  generic: genericRestProvider,
};

/**
 * @param {{ provider: string, apiKey: string, model: string, baseUrl?: string|null }} config
 * @returns {LLMAdapter}
 */
export function createLLMAdapter(config) {
  const provider = PROVIDERS[config.provider] ?? PROVIDERS.groq;

  return {
    name: provider.name,
    supportsSeed: provider.supportsSeed,
    complete: (req) => provider.complete(req, config),
  };
}
