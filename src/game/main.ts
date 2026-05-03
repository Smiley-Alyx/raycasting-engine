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
} from './rayc';
import { loadLevel, loadLevelsIndex } from './levels/level-loader';
import { DEFAULT_SFX } from './audio/sfx-config';

const CUSTOM_LEVEL_STORAGE_KEY = 'rayc.customLevel';

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
}

let running = false;

async function startLevelById(levelId: string) {
  unlockAudio();

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

  setAudioConfig({
    music: level.audio?.music ?? null,
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

  const level = parseCustomLevelJson(raw);

  setLegend(level.legend as unknown as Record<number, string>);
  setMap(level.rows.map((row) => row.split('').map((c) => Number(c) || 0)));
  setSpawn(level.spawn);
  setBackgroundColors(level.colors ?? {});

  setAudioConfig({
    music: level.audio?.music ?? null,
    sfx: DEFAULT_SFX,
  });
  playMusic();

  hideMenu();
  startRayc();
  running = true;
}

function initMenu() {
  showMenu();

  const levelsRoot = document.getElementById('menuLevels');
  const editorBtn = document.getElementById('menuEditorBtn');

  if (levelsRoot instanceof HTMLElement) {
    void (async () => {
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
    })();
  }

  if (editorBtn instanceof HTMLButtonElement) {
    editorBtn.addEventListener('click', () => {
      window.location.href = '/editor.html';
    });
  }
}

window.addEventListener('keydown', (e: KeyboardEvent) => {
  if (e.code !== 'Escape' || e.repeat) return;
  if (!running) return;
  stopRayc();
  showMenu();
  running = false;
});
initAudioUi();
initMenu();
void maybeStartCustomFromEditor();
