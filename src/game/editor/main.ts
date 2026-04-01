const editorRoot = document.getElementById('editorRoot');
if (!editorRoot) {
  throw new Error('Missing #editorRoot element');
}

const root = editorRoot;

const canvas = document.createElement('canvas');
canvas.id = 'editorCanvas';
root.appendChild(canvas);

const ctx = canvas.getContext('2d');
if (!ctx) {
  throw new Error('Failed to get 2d context');
}

const ctx2d = ctx;
ctx2d.imageSmoothingEnabled = false;

const mapWidthInput = document.getElementById('mapWidthInput');
const mapHeightInput = document.getElementById('mapHeightInput');
const resizeMapBtn = document.getElementById('resizeMapBtn');
const tileSelect = document.getElementById('tileSelect');
const clearMapBtn = document.getElementById('clearMapBtn');
const exportBtn = document.getElementById('exportBtn');
const exportOutput = document.getElementById('exportOutput');
const backBtn = document.getElementById('backToGameBtn');

function readInt(el: HTMLElement | null, fallback: number) {
  if (!(el instanceof HTMLInputElement)) return fallback;
  const v = Number(el.value);
  return Number.isFinite(v) ? Math.floor(v) : fallback;
}

function readBrush() {
  if (!(tileSelect instanceof HTMLSelectElement)) return 1;
  const v = Number(tileSelect.value);
  return Number.isFinite(v) ? v : 1;
}

let mapW = readInt(mapWidthInput as HTMLElement | null, 32);
let mapH = readInt(mapHeightInput as HTMLElement | null, 24);

let grid: number[][] = [];

function makeGrid(w: number, h: number, fill = 0) {
  const g: number[][] = [];
  for (let y = 0; y < h; y++) {
    const row: number[] = [];
    for (let x = 0; x < w; x++) row.push(fill);
    g.push(row);
  }
  return g;
}

function resizeGrid(w: number, h: number) {
  const next = makeGrid(w, h, 0);
  for (let y = 0; y < Math.min(h, grid.length); y++) {
    for (let x = 0; x < Math.min(w, grid[y]?.length ?? 0); x++) {
      next[y][x] = grid[y][x];
    }
  }
  grid = next;
  mapW = w;
  mapH = h;
}

grid = makeGrid(mapW, mapH, 0);

function resizeCanvas() {
  const rect = root.getBoundingClientRect();
  const cssWidth = Math.max(1, Math.floor(rect.width));
  const cssHeight = Math.max(1, Math.floor(rect.height));
  const dpr = window.devicePixelRatio || 1;

  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx2d.imageSmoothingEnabled = false;
}

function tileToColor(tile: number) {
  if (tile === 0) return '#0b0c10';
  if (tile === 1) return '#6b4a2b';
  if (tile === 6) return '#3a8fb7';
  return '#a23b72';
}

function draw() {
  const rect = root.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));

  ctx2d.clearRect(0, 0, w, h);

  const cell = Math.max(6, Math.floor(Math.min(w / mapW, h / mapH)));
  const gridW = cell * mapW;
  const gridH = cell * mapH;
  const offsetX = Math.floor((w - gridW) / 2);
  const offsetY = Math.floor((h - gridH) / 2);

  ctx2d.fillStyle = '#000';
  ctx2d.fillRect(0, 0, w, h);

  for (let y = 0; y < mapH; y++) {
    for (let x = 0; x < mapW; x++) {
      ctx2d.fillStyle = tileToColor(grid[y][x]);
      ctx2d.fillRect(offsetX + x * cell, offsetY + y * cell, cell, cell);
    }
  }

  ctx2d.strokeStyle = 'rgba(243, 210, 122, 0.18)';
  ctx2d.lineWidth = 1;
  ctx2d.beginPath();
  for (let x = 0; x <= mapW; x++) {
    const px = offsetX + x * cell;
    ctx2d.moveTo(px, offsetY);
    ctx2d.lineTo(px, offsetY + gridH);
  }
  for (let y = 0; y <= mapH; y++) {
    const py = offsetY + y * cell;
    ctx2d.moveTo(offsetX, py);
    ctx2d.lineTo(offsetX + gridW, py);
  }
  ctx2d.stroke();
}

let painting = false;

function paintAtClient(clientX: number, clientY: number) {
  const rect = root.getBoundingClientRect();
  const w = Math.max(1, Math.floor(rect.width));
  const h = Math.max(1, Math.floor(rect.height));
  const cell = Math.max(6, Math.floor(Math.min(w / mapW, h / mapH)));
  const gridW = cell * mapW;
  const gridH = cell * mapH;
  const offsetX = Math.floor((w - gridW) / 2);
  const offsetY = Math.floor((h - gridH) / 2);

  const x = Math.floor((clientX - rect.left - offsetX) / cell);
  const y = Math.floor((clientY - rect.top - offsetY) / cell);
  if (x < 0 || y < 0 || x >= mapW || y >= mapH) return;

  grid[y][x] = readBrush();
}

canvas.addEventListener('pointerdown', (e: PointerEvent) => {
  painting = true;
  canvas.setPointerCapture(e.pointerId);
  paintAtClient(e.clientX, e.clientY);
});

canvas.addEventListener('pointermove', (e: PointerEvent) => {
  if (!painting) return;
  paintAtClient(e.clientX, e.clientY);
});

canvas.addEventListener('pointerup', () => {
  painting = false;
});

canvas.addEventListener('pointercancel', () => {
  painting = false;
});

if (resizeMapBtn instanceof HTMLButtonElement) {
  resizeMapBtn.addEventListener('click', () => {
    const w = Math.max(4, Math.min(128, readInt(mapWidthInput as HTMLElement | null, mapW)));
    const h = Math.max(4, Math.min(128, readInt(mapHeightInput as HTMLElement | null, mapH)));
    resizeGrid(w, h);
  });
}

if (clearMapBtn instanceof HTMLButtonElement) {
  clearMapBtn.addEventListener('click', () => {
    grid = makeGrid(mapW, mapH, 0);
  });
}

function exportLevelJson() {
  const rows = grid.map((row) => row.map((v) => String(v)).join(''));
  const levelJson = {
    id: 'custom',
    name: 'Custom',
    legend: {
      0: 'empty',
      1: 'wall',
      6: 'door',
    },
    audio: {
      music: null,
    },
    spawn: { x: 2, y: 2, rot: 0 },
    rows,
  };
  return JSON.stringify(levelJson, null, 2);
}

if (exportBtn instanceof HTMLButtonElement) {
  exportBtn.addEventListener('click', () => {
    if (exportOutput instanceof HTMLTextAreaElement) {
      exportOutput.value = exportLevelJson();
      exportOutput.focus();
      exportOutput.select();
    }
  });
}

if (backBtn instanceof HTMLButtonElement) {
  backBtn.addEventListener('click', () => {
    window.location.href = '/';
  });
}

resizeCanvas();
window.addEventListener('resize', () => {
  resizeCanvas();
});

function loop() {
  draw();
  requestAnimationFrame(loop);
}

loop();
