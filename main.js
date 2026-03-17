import './canvas-init.js';
import './map.js';
import { startRayc, setMap, setSpawn } from './rayc.js';
import { loadLevel, loadLevelsIndex } from './level-loader.js';

const levelsIndex = await loadLevelsIndex('/levels/index.json');
const defaultLevel = levelsIndex.levels.find((l) => l.id === levelsIndex.default);
if (!defaultLevel) {
  throw new Error('Default level not found in levels index');
}

const level = await loadLevel(defaultLevel.file);
setMap(level.grid);
setSpawn(level.spawn);

startRayc();
