import { disposeRayc, setLegend, setMap, setSpawn, startRayc, stopRayc } from '../rayc';
import { getCanvas, getCanvasCssHeight, getCanvasCssWidth, getCtx } from '../canvas-init';

window.setMap = setMap;
window.setSpawn = setSpawn;
window.setLegend = setLegend;
window.startRayc = startRayc;
window.stopRayc = stopRayc;
window.disposeRayc = disposeRayc;

Object.defineProperties(window, {
  canvas: {
    get: getCanvas,
  },
  ctx: {
    get: getCtx,
  },
  canvasCssWidth: {
    get: getCanvasCssWidth,
  },
  canvasCssHeight: {
    get: getCanvasCssHeight,
  },
});
