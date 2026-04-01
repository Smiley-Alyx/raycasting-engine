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
  getAudioState,
  setMusicEnabled,
  setSfxEnabled,
  setMusicVolume,
  setSfxVolume,
} from './rayc';
import { loadLevel, loadLevelsIndex } from './levels/level-loader';
import { DEFAULT_SFX } from './audio/sfx-config';

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

  const level1Btn = document.getElementById('menuLevel1Btn');
  const editorBtn = document.getElementById('menuEditorBtn');

  if (level1Btn instanceof HTMLButtonElement) {
    level1Btn.addEventListener('click', () => {
      void startLevelById('level1');
    });
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
