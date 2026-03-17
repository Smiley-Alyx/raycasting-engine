let map = null;
let cellLegend = {};

export function setMap(newMap) {
  map = newMap;
  window.map = newMap;
}

export function getMap() {
  return map;
}

export function setLegend(newLegend) {
  if (!newLegend || typeof newLegend !== 'object') {
    cellLegend = {};
    return;
  }

  const cleaned = {};
  for (const [k, v] of Object.entries(newLegend)) {
    if (typeof k !== 'string') continue;
    if (typeof v !== 'string') continue;
    cleaned[k] = v;
  }
  cellLegend = cleaned;
}

export function getLegend() {
  return cellLegend;
}

export function hitWall(x, y) {
  if (!map || !map.length || !map[0] || !map[0].length) return true;
  if (x < 0 || x >= map[0].length || y < 0 || y >= map.length) {
    return true;
  }
  return map[Math.floor(y)][Math.floor(x)] != 0;
}

export function getCellMaterial(xMap, yMap) {
  if (!map) return 0;
  const cellId = map[yMap][xMap];
  return cellLegend[String(cellId)] || cellId;
}
