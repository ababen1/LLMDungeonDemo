import { validateAbstractStructure } from '../schema/abstractSchema.js';
import { buildGraph } from './graph.js';
import { checkSemantic, checkSelfCheck } from './semantic.js';

/**
 * @param {object} abstract
 * @param {{ seed: number, difficulty: number, density: number }} params
 * @param {object} derived
 * @returns {{ ok: boolean, violations: { code: string, detail: string }[] }}
 */
export function validateAbstract(abstract, params, derived) {
  const violations = [...validateAbstractStructure(abstract)];

  if (violations.length > 0) {
    return { ok: false, violations };
  }

  const m = abstract.metadata;
  if (m.seed !== params.seed) {
    violations.push({ code: 'METADATA_MISMATCH', detail: `seed ${m.seed} !== ${params.seed}` });
  }
  if (m.difficulty !== params.difficulty) {
    violations.push({ code: 'METADATA_MISMATCH', detail: `difficulty mismatch` });
  }
  if (m.density !== params.density) {
    violations.push({ code: 'METADATA_MISMATCH', detail: `density mismatch` });
  }

  const graph = buildGraph(abstract);
  const semanticViolations = checkSemantic(abstract, graph);
  violations.push(...semanticViolations);
  violations.push(...checkSelfCheck(abstract, semanticViolations));

  const unique = dedupeViolations(violations);
  return { ok: unique.length === 0, violations: unique };
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
