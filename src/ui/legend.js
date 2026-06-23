import { COLOR_HEX, LEGEND_ITEMS } from '../render/colors.js';

/**
 * Render color legend into a container element.
 * @param {HTMLElement} container
 */
export function renderLegend(container) {
  container.innerHTML = '';
  container.setAttribute('aria-label', 'Map color legend');

  const title = document.createElement('div');
  title.className = 'legend-title';
  title.textContent = 'Legend';
  container.appendChild(title);

  const list = document.createElement('ul');
  list.className = 'legend-list';

  for (const item of LEGEND_ITEMS) {
    const li = document.createElement('li');
    li.className = 'legend-item';

    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.backgroundColor = COLOR_HEX[item.key];
    swatch.setAttribute('aria-hidden', 'true');

    const label = document.createElement('span');
    label.className = 'legend-label';
    label.textContent = item.label;

    li.append(swatch, label);
    list.appendChild(li);
  }

  container.appendChild(list);
}
