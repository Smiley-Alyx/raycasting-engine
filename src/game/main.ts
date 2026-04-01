import '../canvas-init';
import { startRayc, setLegend, setMap, setSpawn, setAudioConfig, unlockAudio, playMusic } from './rayc';
import { loadLevel, loadLevelsIndex } from './levels/level-loader';
import { DEFAULT_SFX } from './audio/sfx-config';

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

startRayc();
