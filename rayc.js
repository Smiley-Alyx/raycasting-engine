import {
  setLegend as setLegendState,
  setMap as setMapState,
} from './map-state.js';
import { createEngine } from './engine.js';

const canvas = window.canvas;
const ctx = window.ctx;

var pendingSpawn = null;
var engine = null;

export function setMap(newMap){
  setMapState(newMap);
}

export function setSpawn(spawn){
  if (!spawn || typeof spawn !== 'object') return;
  if (!engine) {
    pendingSpawn = spawn;
    return;
  }
  engine.setSpawn(spawn);
}

export function setLegend(newLegend){
  setLegendState(newLegend);
}

window.setMap = setMap;
window.setSpawn = setSpawn;
window.setLegend = setLegend;

// Логические размеры канваса (в CSS-пикселях). При HiDPI canvas.width/height
// могут быть больше, поэтому движок должен опираться на "логический" размер.
function getViewWidth(){
  return (typeof window.canvasCssWidth === 'number') ? window.canvasCssWidth : canvas.width;
}

function getViewHeight(){
  return (typeof window.canvasCssHeight === 'number') ? window.canvasCssHeight : canvas.height;
}

function ensureEngine(){
  if (engine) return engine;
  engine = createEngine({ ctx, getViewWidth, getViewHeight });
  if (pendingSpawn) {
    engine.setSpawn(pendingSpawn);
    pendingSpawn = null;
  }
  return engine;
}

export function startRayc(){
  if (window.__raycStarted) return;
  window.__raycStarted = true;
  ensureEngine().start();
}

window.startRayc = startRayc;