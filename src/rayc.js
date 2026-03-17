import { setLegend as setLegendState, setMap as setMapState } from './state/map-state.js';
import { createEngine } from './engine/engine.js';
import { getCanvas, getCanvasCssHeight, getCanvasCssWidth, getCtx } from './canvas-init.js';

let pendingSpawn = null;
let engine = null;

export function setMap(newMap) {
  setMapState(newMap);
}

export function setSpawn(spawn) {
  if (!spawn || typeof spawn !== 'object') return;
  if (!engine) {
    pendingSpawn = spawn;
    return;
  }
  engine.setSpawn(spawn);
}

export function setLegend(newLegend) {
  setLegendState(newLegend);
}

// Логические размеры канваса (в CSS-пикселях). При HiDPI canvas.width/height
// могут быть больше, поэтому движок должен опираться на "логический" размер.
function getViewWidth() {
  const cssWidth = getCanvasCssWidth();
  if (typeof cssWidth === 'number') return cssWidth;
  const canvas = getCanvas();
  return canvas ? canvas.width : 0;
}

function getViewHeight() {
  const cssHeight = getCanvasCssHeight();
  if (typeof cssHeight === 'number') return cssHeight;
  const canvas = getCanvas();
  return canvas ? canvas.height : 0;
}

function ensureEngine() {
  if (engine) return engine;
  const ctx = getCtx();
  if (!ctx) {
    throw new Error('Canvas context is not initialized. Did you import canvas-init.js first?');
  }
  engine = createEngine({ ctx, getViewWidth, getViewHeight });
  if (pendingSpawn) {
    const spawn = pendingSpawn;
    pendingSpawn = null;
    engine.setSpawn(spawn);
  }
  return engine;
}

export function startRayc() {
  ensureEngine().start();
}

export function stopRayc() {
  if (!engine) return;
  engine.stop();
}

export function disposeRayc() {
  if (!engine) return;
  engine.dispose();
  engine = null;
  pendingSpawn = null;
}
