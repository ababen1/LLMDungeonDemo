/**
 * @param {import('../render/renderer.js').DungeonRenderer} renderer
 * @param {HTMLElement | null} container
 */
export function initZoomControls(renderer, container) {
  if (!container) return;

  const zoomIn = document.getElementById('zoom-in');
  const zoomOut = document.getElementById('zoom-out');
  const zoomReset = document.getElementById('zoom-reset');

  zoomIn?.addEventListener('click', () => renderer.zoomIn());
  zoomOut?.addEventListener('click', () => renderer.zoomOut());
  zoomReset?.addEventListener('click', () => renderer.resetZoom());
}
