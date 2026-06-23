import { DEFAULT_PARAMS } from '../config/defaults.js';

/**
 * @typedef {'step'|'request'|'response'|'error'|'info'} LogType
 */

/**
 * @param {{ onGenerate: (params: { seed: number, difficulty: number, density: number }) => void }} handlers
 */
export function initUI({ onGenerate }) {
  const seedInput = /** @type {HTMLInputElement} */ (document.getElementById('seed'));
  const difficultyInput = /** @type {HTMLInputElement} */ (document.getElementById('difficulty'));
  const densityInput = /** @type {HTMLInputElement} */ (document.getElementById('density'));
  const difficultyLabel = document.getElementById('difficulty-label');
  const densityLabel = document.getElementById('density-label');
  const generateBtn = /** @type {HTMLButtonElement} */ (document.getElementById('generate'));
  const statusEl = document.getElementById('status');
  const logEl = document.getElementById('log');
  const clearLogBtn = /** @type {HTMLButtonElement} */ (document.getElementById('clear-log'));

  seedInput.value = String(DEFAULT_PARAMS.seed);
  difficultyInput.value = String(DEFAULT_PARAMS.difficulty);
  densityInput.value = String(DEFAULT_PARAMS.density);
  difficultyLabel.textContent = String(DEFAULT_PARAMS.difficulty);
  densityLabel.textContent = String(DEFAULT_PARAMS.density);

  difficultyInput.addEventListener('input', () => {
    difficultyLabel.textContent = difficultyInput.value;
  });

  densityInput.addEventListener('input', () => {
    densityLabel.textContent = densityInput.value;
  });

  clearLogBtn.addEventListener('click', () => {
    logEl.innerHTML = '';
  });

  let running = false;

  generateBtn.addEventListener('click', () => {
    if (running) return;

    const seed = clampInt(parseInt(seedInput.value, 10), 0, 999999);
    const difficulty = clampInt(parseInt(difficultyInput.value, 10), 1, 5);
    const density = clampInt(parseInt(densityInput.value, 10), 1, 5);

    seedInput.value = String(seed);
    onGenerate({ seed, difficulty, density });
  });

  /**
   * @param {LogType} type
   * @param {string} label
   * @param {unknown} [body]
   */
  function appendLog(type, label, body) {
    const entry = document.createElement('div');
    entry.className = 'log-entry';

    const meta = document.createElement('div');
    meta.className = 'log-meta';

    const time = document.createElement('span');
    time.className = 'log-time';
    time.textContent = formatTime(new Date());

    const typeEl = document.createElement('span');
    typeEl.className = `log-type log-type-${type}`;
    typeEl.textContent = type;

    const labelEl = document.createElement('span');
    labelEl.className = 'log-label';
    labelEl.textContent = label;

    meta.append(time, typeEl, labelEl);
    entry.appendChild(meta);

    if (body !== undefined && body !== null) {
      const bodyEl = document.createElement('div');
      bodyEl.className = 'log-body log-body-collapsed';
      bodyEl.textContent = formatBody(body);

      const expandBtn = document.createElement('button');
      expandBtn.type = 'button';
      expandBtn.className = 'log-expand';
      expandBtn.textContent = 'Show more';
      expandBtn.addEventListener('click', () => {
        const collapsed = bodyEl.classList.toggle('log-body-collapsed');
        expandBtn.textContent = collapsed ? 'Show more' : 'Show less';
      });

      entry.append(bodyEl, expandBtn);
    }

    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
  }

  return {
    getParams() {
      return {
        seed: clampInt(parseInt(seedInput.value, 10), 0, 999999),
        difficulty: clampInt(parseInt(difficultyInput.value, 10), 1, 5),
        density: clampInt(parseInt(densityInput.value, 10), 1, 5),
      };
    },
    setRunning(isRunning) {
      running = isRunning;
      generateBtn.disabled = isRunning;
      generateBtn.textContent = isRunning ? 'Working…' : 'Generate';
    },
    setStatus(msg, type = 'idle') {
      statusEl.textContent = msg;
      statusEl.className = `status status-${type}`;
    },
    clearLog() {
      logEl.innerHTML = '';
    },
    log: {
      step(label, detail) {
        appendLog('step', label, detail);
      },
      request(label, payload) {
        appendLog('request', label, payload);
      },
      response(label, payload) {
        appendLog('response', label, payload);
      },
      error(label, detail) {
        appendLog('error', label, detail);
      },
      info(label, detail) {
        appendLog('info', label, detail);
      },
    },
  };
}

function formatTime(date) {
  return date.toLocaleTimeString(undefined, {
    hour12: false,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    fractionalSecondDigits: 3,
  });
}

function formatBody(body) {
  if (typeof body === 'string') return body;
  try {
    return JSON.stringify(body, null, 2);
  } catch {
    return String(body);
  }
}

function clampInt(v, min, max) {
  if (Number.isNaN(v)) return min;
  return Math.max(min, Math.min(max, v));
}
