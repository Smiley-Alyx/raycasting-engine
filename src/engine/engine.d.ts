import type { Grid, Legend, Player, Spawn } from '../types/game';

export function createEngine(args: {
  ctx: CanvasRenderingContext2D;
  getViewWidth: () => number;
  getViewHeight: () => number;
}): {
  start(): void;
  stop(): void;
  dispose(): void;
  setMap(newMap: Grid): void;
  setLegend(newLegend: Legend): void;
  setSpawn(spawn: Spawn | null): void;
  player: Player;
};
