import { initUI } from './ui/ui.js';
import { renderLegend } from './ui/legend.js';
import { DungeonRenderer } from './render/renderer.js';
import { generateDungeon } from './generation/orchestrator.js';

document.addEventListener('DOMContentLoaded', () => {
  const legendEl = document.getElementById('map-legend');
  if (legendEl) renderLegend(legendEl);
  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('dungeon-canvas'));
  const renderer = new DungeonRenderer();
  renderer.init(canvas);

  const ui = initUI({
    onGenerate: async (params) => {
      ui.setRunning(true);
      ui.clearLog();
      ui.log.step('Run started', params);
      await generateDungeon(params, {
        onStatus: (msg, type) => ui.setStatus(msg, type),
        renderer,
        log: ui.log,
      });
      ui.setRunning(false);
    },
  });

  ui.setStatus('Ready.', 'idle');
});
