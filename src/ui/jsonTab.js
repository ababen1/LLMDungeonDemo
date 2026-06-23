import { validateDungeonJson } from '../validation/validateDungeonJson.js';
import { deriveParams } from '../schema/paramDerivation.js';

/**
 * @param {{ setDungeonJson: (d: object) => void, getParams: () => { seed: number, difficulty: number, density: number } }} ctx
 */
export function initJsonTab(ctx) {
  const mapTab = /** @type {HTMLButtonElement} */ (document.getElementById('tab-map'));
  const jsonTabBtn = /** @type {HTMLButtonElement} */ (document.getElementById('tab-json'));
  const mapView = document.getElementById('map-view');
  const jsonView = document.getElementById('json-view');
  const jsonOutput = document.getElementById('json-output');
  const jsonResult = document.getElementById('json-validate-result');
  const copyBtn = /** @type {HTMLButtonElement} */ (document.getElementById('copy-json'));
  const validateBtn = /** @type {HTMLButtonElement} */ (document.getElementById('validate-json'));

  mapTab.addEventListener('click', () => switchTab('map'));
  jsonTabBtn.addEventListener('click', () => switchTab('json'));

  copyBtn.addEventListener('click', async () => {
    const text = jsonOutput.textContent ?? '';
    if (!text || text.startsWith('No dungeon')) {
      setJsonResult('Nothing to copy.', 'error');
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setJsonResult('Copied to clipboard.', 'success');
    } catch {
      setJsonResult('Copy failed — check browser permissions.', 'error');
    }
  });

  validateBtn.addEventListener('click', () => {
    const text = jsonOutput.textContent ?? '';
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      setJsonResult(`Invalid JSON: ${e instanceof Error ? e.message : String(e)}`, 'error');
      return;
    }

    const params = ctx.getParams();
    const result = validateDungeonJson(json, params);
    const derived = deriveParams(params.seed, params.difficulty, params.density);

    if (result.ok) {
      setJsonResult(
        `Valid (${result.format} layout). ${json.rooms?.length ?? 0} rooms, grid ${derived.gridW}×${derived.gridH} expected for current density.`,
        'success'
      );
    } else {
      const lines = result.violations.map((v) => `[${v.code}] ${v.detail}`).join('\n');
      setJsonResult(`Invalid (${result.format}):\n${lines}`, 'error');
    }
  });

  function switchTab(tab) {
    const isMap = tab === 'map';
    mapTab.classList.toggle('view-tab-active', isMap);
    jsonTabBtn.classList.toggle('view-tab-active', !isMap);
    mapView.classList.toggle('view-hidden', !isMap);
    jsonView.classList.toggle('view-hidden', isMap);
    mapTab.setAttribute('aria-selected', String(isMap));
    jsonTabBtn.setAttribute('aria-selected', String(!isMap));
  }

  function setJsonResult(msg, type) {
    jsonResult.textContent = msg;
    jsonResult.className = `json-validate-result json-validate-${type}`;
  }

  return {
    setDungeonJson(dungeon) {
      jsonOutput.textContent = JSON.stringify(dungeon, null, 2);
      setJsonResult('', 'idle');
    },
    clearDungeonJson() {
      jsonOutput.textContent = 'No dungeon generated yet.';
      setJsonResult('', 'idle');
    },
  };
}
