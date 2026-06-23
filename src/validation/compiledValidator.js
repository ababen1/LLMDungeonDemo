import { validateCompiledStructure } from '../schema/compiledSchema.js';
import { checkGeometry } from './geometry.js';

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

  return { ok: violations.length === 0, violations };
}
