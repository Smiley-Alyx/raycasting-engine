import '../canvas-init';
import {
  startRayc,
  setLegend,
  setMap,
  setSpawn,
  setAudioConfig,
  unlockAudio,
  playMusic,
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

const levelsIndex = await loadLevelsIndex('/levels/index.json');
const defaultLevel = levelsIndex.levels.find(
  (l: { id: string; file: string }) => l.id === levelsIndex.default,
);
if (!defaultLevel) {
  throw new Error('Default level not found in levels index');
}

const level = await loadLevel(defaultLevel.file);
setLegend(level.legend);
setMap(level.grid);
setSpawn(level.spawn);

setAudioConfig({
  music: level.audio?.music ?? null,
  sfx: DEFAULT_SFX,
});
playMusic();

initAudioUi();

startRayc();
