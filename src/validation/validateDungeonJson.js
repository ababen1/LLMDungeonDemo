import { deriveParams } from '../schema/paramDerivation.js';
import { validateAbstract } from './abstractValidator.js';
import { validateCompiled } from './compiledValidator.js';

/**
 * @param {unknown} json
 * @returns {boolean}
 */
export function isAbstractLayout(json) {
  if (!json || typeof json !== 'object') return false;
  const rooms = /** @type {{ rooms?: unknown[] }} */ (json).rooms;
  if (!Array.isArray(rooms) || rooms.length === 0) return false;
  const first = rooms[0];
  return first && typeof first === 'object' && 'anchor' in first && !('pos' in first);
}

/**
 * @param {unknown} json
 * @returns {boolean}
 */
export function isCompiledLayout(json) {
  if (!json || typeof json !== 'object') return false;
  const rooms = /** @type {{ rooms?: unknown[] }} */ (json).rooms;
  if (!Array.isArray(rooms) || rooms.length === 0) return false;
  const first = rooms[0];
  return first && typeof first === 'object' && Array.isArray(first.pos);
}

/**
 * Full constraint validation for abstract or compiled dungeon JSON.
 * @param {object} json
 * @param {{ seed: number, difficulty: number, density: number } | null} [params]
 * @returns {{ ok: boolean, violations: { code: string, detail: string }[], format: 'abstract'|'compiled'|'unknown' }}
 */
export function validateDungeonJson(json, params = null) {
  if (!json || typeof json !== 'object') {
    return {
      ok: false,
      format: 'unknown',
      violations: [{ code: 'PARSE_ERROR', detail: 'JSON must be an object' }],
    };
  }

  if (isAbstractLayout(json)) {
    const p = params ?? inferParamsFromMetadata(json);
    if (!p) {
      return {
        ok: false,
        format: 'abstract',
        violations: [{ code: 'METADATA_MISMATCH', detail: 'Provide seed/difficulty/density or include them in metadata' }],
      };
    }
    const derived = deriveParams(p.seed, p.difficulty, p.density);
    const result = validateAbstract(json, p, derived);
    return { ...result, format: 'abstract' };
  }

  if (isCompiledLayout(json)) {
    const violations = [];
    const compiledResult = validateCompiled(json);
    violations.push(...compiledResult.violations);

    const p = params ?? inferParamsFromMetadata(json);
    if (p && json.metadata) {
      const derived = deriveParams(p.seed, p.difficulty, p.density);
      const m = json.metadata;
      if (m.seed !== p.seed) violations.push({ code: 'METADATA_MISMATCH', detail: 'seed mismatch' });
      if (m.difficulty !== p.difficulty) violations.push({ code: 'METADATA_MISMATCH', detail: 'difficulty mismatch' });
      if (m.density !== p.density) violations.push({ code: 'METADATA_MISMATCH', detail: 'density mismatch' });
      if (m.gridSize && (m.gridSize[0] !== derived.gridW || m.gridSize[1] !== derived.gridH)) {
        violations.push({ code: 'METADATA_MISMATCH', detail: 'gridSize does not match density' });
      }
    }

    const unique = dedupeViolations(violations);
    return { ok: unique.length === 0, violations: unique, format: 'compiled' };
  }

  return {
    ok: false,
    format: 'unknown',
    violations: [{ code: 'SCHEMA', detail: 'Unrecognized format (expected abstract or compiled layout)' }],
  };
}

function inferParamsFromMetadata(json) {
  const m = json.metadata;
  if (!m || !Number.isInteger(m.seed) || !Number.isInteger(m.difficulty) || !Number.isInteger(m.density)) {
    return null;
  }
  return { seed: m.seed, difficulty: m.difficulty, density: m.density };
}

function dedupeViolations(violations) {
  const seen = new Set();
  return violations.filter((v) => {
    const key = `${v.code}:${v.detail}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
