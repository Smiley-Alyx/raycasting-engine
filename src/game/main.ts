import '../canvas-init';
import { startRayc, setLegend, setMap, setSpawn } from './rayc';
import { loadLevel, loadLevelsIndex } from './levels/level-loader';

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

startRayc();
