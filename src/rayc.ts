import type { Grid, Legend, Spawn } from './types/game';
import { createEngine } from './engine/engine';
import { getCanvas, getCanvasCssHeight, getCanvasCssWidth, getCtx } from './canvas-init.js';

type EngineInstance = ReturnType<typeof createEngine>;

let engine: EngineInstance | null = null;

export function setMap(newMap: Grid) {
  ensureEngine().setMap(newMap);
}

export function setSpawn(spawn: Spawn | null) {
  if (!spawn || typeof spawn !== 'object') return;
  ensureEngine().setSpawn(spawn);
}

export function setLegend(newLegend: Legend) {
  ensureEngine().setLegend(newLegend);
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
}
