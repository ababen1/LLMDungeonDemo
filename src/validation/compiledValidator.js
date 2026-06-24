import { validateCompiledStructure } from '../schema/compiledSchema.js';
import { checkGeometry } from './geometry.js';
import { checkSpatialSemantic } from './spatialSemantic.js';
import { checkSelfCheck } from './semantic.js';

/**
 * @param {object} compiled
 * @returns {{ ok: boolean, violations: { code: string, detail: string }[] }}
 */
export function validateCompiled(compiled) {
  const violations = [...validateCompiledStructure(compiled)];
  if (violations.length > 0) {
    return { ok: false, violations };
  }

  violations.push(...checkGeometry(compiled));

  const spatialViolations = checkSpatialSemantic(compiled);
  violations.push(...spatialViolations);
  violations.push(...checkSelfCheck(compiled, spatialViolations));

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
