var map = window.map;
var cellLegend = {};

export function setMap(newMap) {
  map = newMap;
  window.map = newMap;
}

export function getMap() {
  return map;
}

export function setLegend(newLegend) {
  cellLegend = newLegend && typeof newLegend === 'object' ? newLegend : {};
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
  var cellId = map[yMap][xMap];
  return cellLegend[String(cellId)] || cellId;
}
