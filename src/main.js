import { initUI } from './ui/ui.js';
import { initJsonTab } from './ui/jsonTab.js';
import { renderLegend } from './ui/legend.js';
import { DungeonRenderer } from './render/renderer.js';
import { generateDungeon } from './generation/orchestrator.js';

document.addEventListener('DOMContentLoaded', () => {
  const legendEl = document.getElementById('map-legend');
  if (legendEl) renderLegend(legendEl);

  const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('dungeon-canvas'));
  const renderer = new DungeonRenderer();
  renderer.init(canvas);

  let jsonTab;

  const ui = initUI({
    onGenerate: async (params) => {
      ui.setRunning(true);
      ui.clearLog();
      ui.log.step('Run started', params);
      await generateDungeon(params, {
        onStatus: (msg, type) => ui.setStatus(msg, type),
        onDungeon: (dungeon) => jsonTab.setDungeonJson(dungeon),
        renderer,
        log: ui.log,
      });
      ui.setRunning(false);
    },
  });

  jsonTab = initJsonTab({
    getParams: () => ui.getParams(),
  });

  ui.setStatus('Ready.', 'idle');
});
