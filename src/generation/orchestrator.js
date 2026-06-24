import { GLOBAL_TIMEOUT_MS, GENERATION_BUDGET_MS, REPAIR_BUDGET_MS } from '../config/defaults.js';
import { getLLMConfig } from '../config/llmConfig.js';
import { createLLMAdapter } from '../llm/llmAdapter.js';
import { parseJSON } from '../llm/jsonExtractor.js';
import { SYSTEM_PROMPT } from '../prompts/systemPrompt.js';
import { buildUserPrompt } from '../prompts/userPrompt.js';
import { buildRepairPrompt } from '../prompts/repairPrompt.js';
import { deriveParams } from '../schema/paramDerivation.js';
import { validateAbstract } from '../validation/abstractValidator.js';
import { validateCompiled } from '../validation/compiledValidator.js';
import { compileLayout } from '../layout/geometryCompiler.js';
import { Deadline, TimeoutError } from '../utils/timeout.js';

/**
 * @typedef {Object} DungeonLogger
 * @property {(label: string, detail?: unknown) => void} step
 * @property {(label: string, payload: unknown) => void} request
 * @property {(label: string, payload: unknown) => void} response
 * @property {(label: string, detail?: unknown) => void} error
 * @property {(label: string, detail?: unknown) => void} info
 */

const noopLogger = {
  step: () => {},
  request: () => {},
  response: () => {},
  error: () => {},
  info: () => {},
};

/**
 * @param {{ seed: number, difficulty: number, density: number }} params
 * @param {{ onStatus: (msg: string, type?: string) => void, onDungeon?: (dungeon: object) => void, renderer: { render: (d: object) => void }, log?: DungeonLogger }} ctx
 */
export async function generateDungeon(params, { onStatus, onDungeon, renderer, log = noopLogger }) {
  const deadline = new Deadline(GLOBAL_TIMEOUT_MS);

  try {
    onStatus('Deriving parameters…', 'info');
    log.step('Deriving parameters', { seed: params.seed, difficulty: params.difficulty, density: params.density });

    const derived = deriveParams(params.seed, params.difficulty, params.density);
    log.info('Derived parameters', derived);

    const config = getLLMConfig();
    log.info('LLM config', {
      provider: config.provider,
      model: config.model,
      baseUrl: config.baseUrl,
      seedSupported: config.seedSupported,
      apiKeySet: Boolean(config.apiKey),
    });

    if (!config.apiKey && config.requiresApiKey !== false) {
      const msg = 'Set VITE_LLM_API_KEY in .env';
      log.error('Missing API key', msg);
      onStatus(msg, 'error');
      return;
    }

    const adapter = createLLMAdapter(config);
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt({ ...params, derived }) },
    ];

    onStatus('Generating layout…', 'info');
    log.step('Generating layout (LLM call)', { budgetMs: GENERATION_BUDGET_MS });

    const genRequest = {
      provider: adapter.name,
      model: config.model,
      temperature: 0,
      maxTokens: 2500,
      seed: adapter.supportsSeed ? params.seed : undefined,
      messages,
    };
    log.request('Generation request', genRequest);

    let raw;
    try {
      raw = await deadline.race(
        adapter.complete({
          messages,
          temperature: 0,
          maxTokens: 2500,
          seed: adapter.supportsSeed ? params.seed : undefined,
          signal: deadline.signal,
        }),
        GENERATION_BUDGET_MS
      );
      log.response('Generation response', {
        latencyMs: raw.latencyMs,
        content: raw.content,
      });
    } catch (e) {
      return handleError(e, onStatus, log);
    }

    let abstract = tryParse(raw.content, log);
    let result = abstract
      ? validateAbstract(abstract, params, derived)
      : { ok: false, violations: [{ code: 'PARSE_ERROR', detail: 'Failed to parse JSON from model response' }] };

    log.info('Abstract validation (initial)', {
      ok: result.ok,
      violations: result.violations,
      parsed: abstract,
    });

    if (!result.ok) {
      onStatus('Repairing layout…', 'info');
      log.step('Repairing layout (LLM call)', {
        budgetMs: REPAIR_BUDGET_MS,
        violations: result.violations,
      });

      const repairMessages = [
        ...messages,
        { role: 'assistant', content: raw.content },
        {
          role: 'user',
          content: buildRepairPrompt({
            params,
            derived,
            invalidJson: abstract ?? raw.content,
            violations: result.violations,
          }),
        },
      ];

      const repairRequest = {
        provider: adapter.name,
        model: config.model,
        temperature: 0,
        maxTokens: 1500,
        seed: adapter.supportsSeed ? params.seed : undefined,
        messages: repairMessages,
      };
      log.request('Repair request', repairRequest);

      try {
        const repairRaw = await deadline.race(
          adapter.complete({
            messages: repairMessages,
            temperature: 0,
            maxTokens: 1500,
            seed: adapter.supportsSeed ? params.seed : undefined,
            signal: deadline.signal,
          }),
          REPAIR_BUDGET_MS
        );
        log.response('Repair response', {
          latencyMs: repairRaw.latencyMs,
          content: repairRaw.content,
        });

        abstract = tryParse(repairRaw.content, log);
        result = abstract
          ? validateAbstract(abstract, params, derived)
          : { ok: false, violations: [{ code: 'PARSE_ERROR', detail: 'Repair response parse failed' }] };

        log.info('Abstract validation (after repair)', {
          ok: result.ok,
          violations: result.violations,
          parsed: abstract,
        });
      } catch (e) {
        return handleError(e, onStatus, log);
      }
    }

    if (!result.ok) {
      const msg = `Validation failed: ${formatViolations(result.violations)}`;
      log.error('Abstract validation failed', { violations: result.violations });
      onStatus(msg, 'error');
      return;
    }

    onStatus('Compiling geometry…', 'info');
    log.step('Compiling geometry', { abstract });

    const compiled = compileLayout(abstract, derived);
    const compiledResult = validateCompiled(compiled);

    log.info('Compiled validation', {
      ok: compiledResult.ok,
      violations: compiledResult.violations,
      compiled,
    });

    if (!compiledResult.ok) {
      const msg = `Compile validation failed: ${formatViolations(compiledResult.violations)}`;
      log.error('Compile validation failed', { violations: compiledResult.violations });
      onStatus(msg, 'error');
      return;
    }

    renderer.render(compiled);
    onDungeon?.(compiled);
    const summary = `${compiled.rooms.length} rooms, ${compiled.corridors.length} corridors, grid ${derived.gridW}×${derived.gridH}`;
    const elapsed = deadline.elapsed();
    log.step('Render complete', { summary, elapsedMs: elapsed });
    onStatus(`Rendered in ${elapsed}ms — ${summary}`, 'success');
  } catch (e) {
    handleError(e, onStatus, log);
  }
}

function tryParse(rawContent, log) {
  try {
    return parseJSON(rawContent);
  } catch (e) {
    log.error('JSON parse failed', {
      message: e instanceof Error ? e.message : String(e),
      rawPreview: rawContent?.slice?.(0, 500),
    });
    return null;
  }
}

function formatViolations(violations) {
  return violations.map((v) => `[${v.code}] ${v.detail}`).join('; ');
}

function handleError(e, onStatus, log) {
  let msg;
  if (e instanceof TimeoutError) {
    msg = e.message;
  } else if (e.name === 'AbortError') {
    msg = 'Generation exceeded 10 second limit. Try lowering difficulty or density.';
  } else {
    msg = e.message || 'Generation failed';
  }
  log.error('Generation error', {
    message: msg,
    name: e?.name,
    stack: e instanceof Error ? e.stack : undefined,
  });
  onStatus(msg, 'error');
}
