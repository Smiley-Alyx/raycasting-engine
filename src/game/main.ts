import '../canvas-init';
import {
  startRayc,
  setLegend,
  setMap,
  setSpawn,
  setAudioConfig,
  unlockAudio,
  playMusic,
  stopRayc,
  setBackgroundColors,
  getAudioState,
  setMusicEnabled,
  setSfxEnabled,
  setMusicVolume,
  setSfxVolume,
  getPlayer,
  setEnemies,
} from './rayc';
import { loadLevel, loadLevelsIndex } from './levels/level-loader';
import { DEFAULT_SFX } from './audio/sfx-config';

const CUSTOM_LEVEL_STORAGE_KEY = 'rayc.customLevel';

function getDefaultMusicForLevelId(levelId: string) {
  const base = new URL(import.meta.env.BASE_URL, window.location.origin);
  const m = /^level(\d+)$/.exec(levelId);
  const src = m ? `/audio/music/level_${m[1]}.wav` : '/audio/music/main.wav';
  return {
    src: new URL(src.startsWith('/') ? src.slice(1) : src, base).toString(),
    loop: true,
    volume: 0.5,
  };
}

function applyMenuAudio() {
  setAudioConfig({
    music: getDefaultMusicForLevelId('menu'),
    sfx: DEFAULT_SFX,
  });
  playMusic();
}

function cloneGrid(grid: number[][]) {
  return grid.map((row) => row.slice());
}

function initDeathUi() {
  const restartBtn = document.getElementById('deathRestartBtn');
  if (restartBtn instanceof HTMLButtonElement) {
    restartBtn.addEventListener('click', () => {
      // Simplest robust restart: reload page.
      window.location.href = '/';
      window.location.reload();
    });
  }
}

function computeInitialVisibleCells({
  grid,
  x,
  y,
  rot,
  fov,
}: {
  grid: number[][];
  x: number;
  y: number;
  rot: number;
  fov: number;
}) {
  const visible = new Set<string>();
  const rays = 64;
  const maxDist = 14;
  const step = 0.12;

  for (let i = 0; i < rays; i++) {
    const a = rot - fov / 2 + (i / (rays - 1)) * fov;
    for (let d = 0; d < maxDist; d += step) {
      const px = x + d * Math.cos(a);
      const py = y - d * Math.sin(a);
      const cx = Math.floor(px);
      const cy = Math.floor(py);
      if (cy < 0 || cy >= grid.length) break;
      if (cx < 0 || cx >= grid[0].length) break;
      visible.add(`${cx},${cy}`);
      if (grid[cy][cx] !== 0) break;
    }
  }

  return visible;
}

function placeRandomEnemies({
  grid,
  player,
  enemyCellId,
}: {
  grid: number[][];
  player: ReturnType<typeof getPlayer>;
  enemyCellId: number;
}) {
  const visible = computeInitialVisibleCells({
    grid,
    x: player.x,
    y: player.y,
    rot: player.rot,
    fov: player.fov,
  });

  const w = grid[0]?.length ?? 0;
  const h = grid.length;
  const approxCount = Math.floor((w * h) / 120);
  const count = Math.max(4, Math.min(14, approxCount));

  const minSpawnDist = 4;
  let placed = 0;
  let attempts = 0;

  const result: Array<{ x: number; y: number }> = [];

  while (placed < count && attempts < 2000) {
    attempts++;
    const x = 1 + Math.floor(Math.random() * Math.max(1, w - 2));
    const y = 1 + Math.floor(Math.random() * Math.max(1, h - 2));
    if (grid[y][x] !== 0) continue;
    if (visible.has(`${x},${y}`)) continue;
    const dist = Math.hypot(player.x - (x + 0.5), player.y - (y + 0.5));
    if (dist < minSpawnDist) continue;
    result.push({ x: x + 0.5, y: y + 0.5 });
    placed++;
  }

  return result;
}

function initAudioUi() {
  const musicToggleBtn = document.getElementById('musicToggleBtn');
  const sfxToggleBtn = document.getElementById('sfxToggleBtn');
  const musicVolumeEl = document.getElementById('musicVolume');
  const sfxVolumeEl = document.getElementById('sfxVolume');

  if (!(musicToggleBtn instanceof HTMLButtonElement)) return;
  if (!(sfxToggleBtn instanceof HTMLButtonElement)) return;
  if (!(musicVolumeEl instanceof HTMLInputElement)) return;
  if (!(sfxVolumeEl instanceof HTMLInputElement)) return;

  const syncUi = () => {
    const state = getAudioState();
    musicToggleBtn.textContent = state.musicEnabled ? 'Music: on' : 'Music: off';
    sfxToggleBtn.textContent = state.sfxEnabled ? 'SFX: on' : 'SFX: off';
    musicVolumeEl.value = String(state.musicVolume);
    sfxVolumeEl.value = String(state.sfxVolume);
  };

  musicToggleBtn.addEventListener('click', () => {
    const state = getAudioState();
    setMusicEnabled(!state.musicEnabled);
    syncUi();
  });

  sfxToggleBtn.addEventListener('click', () => {
    const state = getAudioState();
    setSfxEnabled(!state.sfxEnabled);
    syncUi();
  });

  musicVolumeEl.addEventListener('input', () => {
    const v = Number(musicVolumeEl.value);
    if (!Number.isFinite(v)) return;
    setMusicVolume(v);
    syncUi();
  });

  sfxVolumeEl.addEventListener('input', () => {
    const v = Number(sfxVolumeEl.value);
    if (!Number.isFinite(v)) return;
    setSfxVolume(v);
    syncUi();
  });

  syncUi();
}

function initHpUi() {
  const hpEl = document.getElementById('hpText');
  if (!(hpEl instanceof HTMLElement)) return;
  const el = hpEl;

  function update() {
    const p = getPlayer();
    el.textContent = `HP: ${Math.max(0, Math.floor(p.hp))}/${Math.max(0, Math.floor(p.maxHp))}`;
    requestAnimationFrame(update);
  }

  update();
}

window.addEventListener(
  'pointerdown',
  () => {
    unlockAudio();
    playMusic();
  },
  { once: true },
);

function hideMenu() {
  const el = document.getElementById('menuRoot');
  if (!(el instanceof HTMLElement)) return;
  el.style.display = 'none';
}

function showMenu() {
  const el = document.getElementById('menuRoot');
  if (!(el instanceof HTMLElement)) return;
  el.style.display = '';
  applyMenuAudio();
}

let running = false;
let dead = false;
let deathTimer: number | null = null;

function showBloodOverlay() {
  const el = document.getElementById('bloodOverlay');
  if (!(el instanceof HTMLElement)) return;
  el.style.display = '';
  // Force layout so transition triggers reliably.
  void el.offsetWidth;
  el.classList.add('is-active');
}

function hideBloodOverlay() {
  const el = document.getElementById('bloodOverlay');
  if (!(el instanceof HTMLElement)) return;
  el.classList.remove('is-active');
  el.style.display = 'none';
}

function showDeathScreen() {
  const el = document.getElementById('deathRoot');
  if (!(el instanceof HTMLElement)) return;
  el.style.display = '';
}

function hideDeathScreen() {
  const el = document.getElementById('deathRoot');
  if (!(el instanceof HTMLElement)) return;
  el.style.display = 'none';
}

function enterDeathState() {
  if (dead) return;
  dead = true;

  stopRayc();
  running = false;

  applyMenuAudio();

  showBloodOverlay();

  // Ensure strong red overlay (renderer already triggers it from engine event).
  if (deathTimer !== null) window.clearTimeout(deathTimer);
  deathTimer = window.setTimeout(() => {
    showDeathScreen();
  }, 2000);
}

async function startLevelById(levelId: string) {
  unlockAudio();

  dead = false;
  if (deathTimer !== null) window.clearTimeout(deathTimer);
  hideDeathScreen();
  hideBloodOverlay();

  const levelsIndex = await loadLevelsIndex('/levels/index.json');
  const levelEntry = levelsIndex.levels.find(
    (l: { id: string; file: string }) => l.id === levelId,
  );
  if (!levelEntry) {
    throw new Error('Level not found in levels index: ' + levelId);
  }

  const level = await loadLevel(levelEntry.file);
  setLegend(level.legend);
  setMap(level.grid);
  setSpawn(level.spawn);
  setBackgroundColors(level.colors);

  const p = getPlayer();
  setEnemies(placeRandomEnemies({ grid: level.grid, player: p, enemyCellId: 9 }));

  setAudioConfig({
    music: level.audio?.music ?? getDefaultMusicForLevelId(levelEntry.id),
    sfx: DEFAULT_SFX,
  });
  playMusic();

  hideMenu();
  startRayc();
  running = true;
}

type CustomLevelJson = {
  id?: string;
  legend: Record<string, string>;
  rows: string[];
  spawn: { x: number; y: number; rot: number };
  colors?: { ceiling?: string; floor?: string };
  audio?: { music?: Parameters<typeof setAudioConfig>[0]['music'] };
};

function parseCustomLevelJson(raw: string): CustomLevelJson {
  const parsed = JSON.parse(raw) as unknown;
  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid custom level JSON');
  }
  const p = parsed as Partial<CustomLevelJson>;
  if ((p.id ?? 'custom') !== 'custom') {
    throw new Error('Custom level must have id="custom"');
  }
  if (!p.legend || typeof p.legend !== 'object') {
    throw new Error('Custom level must have legend');
  }
  if (!Array.isArray(p.rows) || !p.rows.every((r) => typeof r === 'string')) {
    throw new Error('Custom level must have rows: string[]');
  }
  if (!p.spawn || typeof p.spawn.x !== 'number' || typeof p.spawn.y !== 'number' || typeof p.spawn.rot !== 'number') {
    throw new Error('Custom level must have spawn');
  }
  return p as CustomLevelJson;
}

async function maybeStartCustomFromEditor() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('play') !== 'custom') return;
  const raw = localStorage.getItem(CUSTOM_LEVEL_STORAGE_KEY);
  if (!raw) return;

  dead = false;
  if (deathTimer !== null) window.clearTimeout(deathTimer);
  hideDeathScreen();
  hideBloodOverlay();

  const level = parseCustomLevelJson(raw);

  const baseLegend = level.legend as unknown as Record<string, string>;
  setLegend(baseLegend as unknown as Record<number, string>);
  const grid = level.rows.map((row) => row.split('').map((c) => Number(c) || 0));
  setMap(grid);
  setSpawn(level.spawn);
  setBackgroundColors(level.colors ?? {});

  const p = getPlayer();
  setEnemies(placeRandomEnemies({ grid, player: p, enemyCellId: 9 }));

  setAudioConfig({
    music: level.audio?.music ?? getDefaultMusicForLevelId('custom'),
    sfx: DEFAULT_SFX,
  });
  playMusic();

  hideMenu();
  startRayc();
  running = true;
}

function initMenu() {
  showMenu();
  hideDeathScreen();

  const levelsRoot = document.getElementById('menuLevels');
  const editorBtn = document.getElementById('menuEditorBtn');

  if (levelsRoot instanceof HTMLElement) {
    void (async () => {
      try {
        const levelsIndex = await loadLevelsIndex('/levels/index.json');
        levelsRoot.innerHTML = '';

        const visibleLevels = levelsIndex.levels.filter((l) => !l.hidden);
        for (const level of visibleLevels) {
          const btn = document.createElement('button');
          btn.className = 'btn';
          btn.type = 'button';
          btn.textContent = level.name ?? level.id;
          btn.addEventListener('click', () => {
            void startLevelById(level.id);
          });
          levelsRoot.appendChild(btn);
        }
      } catch (err) {
        console.error('Failed to load levels index', err);
        levelsRoot.innerHTML = '';

        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.type = 'button';
        btn.textContent = 'Start';
        btn.addEventListener('click', () => {
          void startLevelById('level1');
        });
        levelsRoot.appendChild(btn);
      }
    })();
  }

  if (editorBtn instanceof HTMLButtonElement) {
    editorBtn.addEventListener('click', () => {
      const base = new URL(import.meta.env.BASE_URL, window.location.origin);
      window.location.href = new URL('editor.html', base).toString();
    });
  }
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code !== 'Escape' || e.repeat) return;
  if (!running) return;
  if (dead) return;
  stopRayc();
  showMenu();
  running = false;
});

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code !== 'KeyH' || e.repeat) return;
  if (!running) return;
  const p = getPlayer();
  p.hp = Math.max(0, p.hp - 10);
});
initAudioUi();
initHpUi();
initDeathUi();
initMenu();
void maybeStartCustomFromEditor();

// Watch HP and enter death state.
requestAnimationFrame(function watchDeath() {
  const p = getPlayer();
  if (!dead && running && p.hp <= 0) {
    enterDeathState();
  }
  requestAnimationFrame(watchDeath);
});
