import type { Grid, Legend } from '../types/game';

let map: Grid | null = null;
let cellLegend: Legend = {};

export function setMap(newMap: Grid) {
  map = newMap;
}

export function getMap(): Grid | null {
  return map;
}

export function setLegend(newLegend: Legend) {
  if (!newLegend || typeof newLegend !== 'object') {
    cellLegend = {};
    return;
  }

  const cleaned: Legend = {};
  for (const [k, v] of Object.entries(newLegend)) {
    if (typeof k !== 'string') continue;
    if (typeof v !== 'string') continue;
    cleaned[k] = v;
  }
  cellLegend = cleaned;
}

export function getLegend(): Legend {
  return cellLegend;
}

export function hitWall(x: number, y: number): boolean {
  if (!map || !map.length || !map[0] || !map[0].length) return true;
  if (x < 0 || x >= map[0].length || y < 0 || y >= map.length) {
    return true;
  }
  return map[Math.floor(y)][Math.floor(x)] != 0;
}

export function getCellMaterial(xMap: number, yMap: number): string | number {
  if (!map) return 0;
  const cellId = map[yMap][xMap];
  return cellLegend[String(cellId)] || cellId;
}
