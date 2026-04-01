import {
  hitWall as hitWallState,
  isDoorCell,
  setCell,
  setLegend as setLegendState,
  setMap as setMapState,
} from '../state/map-state';
import { castRays } from '../raycast/raycaster';
import type { Grid, Legend, Player, Spawn } from '../types/game';

type Input = {
  bind: () => void;
  unbind: () => void;
  isDown: (code: string) => boolean;
};

type Renderer = {
  drawBackground: () => void;
  drawRay: (dist: number, x: number, offset: number, img: string | number) => void;
  drawMap: () => void;
};

type EngineEvents = {
  onDoorOpen?: (xMap: number, yMap: number) => void;
};

export function createEngine({
  ctx,
  getViewWidth,
  getViewHeight,
  player,
  input,
  renderer,
  events,
}: {
  ctx: CanvasRenderingContext2D;
  getViewWidth: () => number;
  getViewHeight: () => number;
  player: Player;
  input: Input;
  renderer: Renderer;
  events?: EngineEvents;
}) {
  let started = false;
  let rafId: number | null = null;

  let previousTime = Date.now();
  let lag = 0.0;
  const MS_PER_UPDATE = 1000 / 60;

  let prevUseDown = false;

  function setSpawn(spawn: Spawn | null) {
    if (!spawn || typeof spawn !== 'object') return;
    if (typeof spawn.x === 'number') player.x = spawn.x;
    if (typeof spawn.y === 'number') player.y = spawn.y;
    if (typeof spawn.rot === 'number') player.rot = spawn.rot;
  }

  function setMap(newMap: Grid) {
    setMapState(newMap);
  }

  function setLegend(newLegend: Legend) {
    setLegendState(newLegend);
  }

  function processInput(dt: number) {
    const useDown = input.isDown('KeyE');
    if (useDown && !prevUseDown) {
      tryOpenDoorInFront();
    }
    prevUseDown = useDown;

    player.mov =
      input.isDown('KeyW') || input.isDown('ArrowUp')
        ? 1
        : input.isDown('KeyS') || input.isDown('ArrowDown')
          ? -1
          : 0;
    player.dir =
      input.isDown('KeyA') || input.isDown('ArrowLeft')
        ? 1
        : input.isDown('KeyD') || input.isDown('ArrowRight')
          ? -1
          : 0;
    player.sprint = input.isDown('ShiftLeft') || input.isDown('ShiftRight') ? 1 : 0;

    const timeScale = dt * 60;

    const step = player.mov * player.speed * (player.sprint + 1) * player.sprintFactor * timeScale;
    const rotStep = player.dir * player.rotSpeed * timeScale;

    player.rot = addRotToAngle(rotStep, player.rot);

    const xNew = player.x + step * Math.cos(player.rot);
    const yNew = player.y - step * Math.sin(player.rot);

    if (!hitWallState(xNew, yNew)) {
      player.x = xNew;
      player.y = yNew;
    }
  }

  function tryOpenDoorInFront() {
    const reach = 0.8;
    const xProbe = player.x + reach * Math.cos(player.rot);
    const yProbe = player.y - reach * Math.sin(player.rot);

    const xMap = Math.floor(xProbe);
    const yMap = Math.floor(yProbe);

    if (isDoorCell(xMap, yMap)) {
      setCell(xMap, yMap, 0);
      events?.onDoorOpen?.(xMap, yMap);
    }
  }

  function addRotToAngle(rot: number, angle: number) {
    const newAngle = angle + rot;
    if (newAngle < 0) {
      return newAngle + (360 * Math.PI) / 180;
    }
    if (newAngle > (360 * Math.PI) / 180) {
      return newAngle - (360 * Math.PI) / 180;
    }
    return newAngle;
  }

  function render() {
    renderer.drawBackground();
    castRays({ player, getViewWidth, addRotToAngle, drawRay: renderer.drawRay });
    if (player.flatmap) renderer.drawMap();
  }

  function update() {}

  function tick() {
    const currentTime = Date.now();
    const elapsedTime = currentTime - previousTime;
    previousTime = currentTime;
    lag += elapsedTime;

    const dt = elapsedTime / 1000;

    processInput(dt);

    while (lag >= MS_PER_UPDATE) {
      update();
      lag -= MS_PER_UPDATE;
    }

    render();

    rafId = requestAnimationFrame(tick);
  }

  function start() {
    if (started) return;
    started = true;
    input.bind();
    rafId = requestAnimationFrame(tick);
  }

  function stop() {
    if (rafId !== null) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    started = false;
  }

  function dispose() {
    stop();
    input.unbind();
  }

  return {
    start,
    stop,
    dispose,
    setMap,
    setLegend,
    setSpawn,
    player,
  };
}
