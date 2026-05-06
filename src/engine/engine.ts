import {
  hitWall as hitWallState,
  isDoorCell,
  getCellMaterial,
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
  drawSprites: (zBuffer: Float64Array) => void;
};

type EngineEvents = {
  onDoorOpen?: (xMap: number, yMap: number) => void;
  onFootstep?: () => void;
  onShoot?: () => void;
  onEnemyKilled?: (xMap: number, yMap: number) => void;
  onPlayerDamaged?: (amount: number) => void;
  onPlayerDied?: () => void;
  onTick?: (dt: number) => void;
};

export function createEngine({
  ctx,
  getViewWidth,
  getViewHeight,
  player,
  input,
  renderer,
  hitSolid,
  events,
}: {
  ctx: CanvasRenderingContext2D;
  getViewWidth: () => number;
  getViewHeight: () => number;
  player: Player;
  input: Input;
  renderer: Renderer;
  hitSolid?: (x: number, y: number) => boolean;
  events?: EngineEvents;
}) {
  let started = false;
  let rafId: number | null = null;

  const solidAt = typeof hitSolid === 'function' ? hitSolid : hitWallState;

  let previousTime = Date.now();
  let lag = 0.0;
  const MS_PER_UPDATE = 1000 / 60;

  let prevUseDown = false;
  let prevShootDown = false;

  let footstepCooldownMs = 0;
  let shootCooldownMs = 0;

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

    const shootDown = input.isDown('Space');
    if (shootDown && !prevShootDown && shootCooldownMs <= 0) {
      events?.onShoot?.();
      shootCooldownMs = 220;
    }
    prevShootDown = shootDown;

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

    const oldX = player.x;
    const oldY = player.y;

    const xNew = player.x + step * Math.cos(player.rot);
    const yNew = player.y - step * Math.sin(player.rot);

    // Sliding movement: try full move, then allow axis moves if diagonal is blocked.
    let moved = false;
    if (!solidAt(xNew, yNew)) {
      player.x = xNew;
      player.y = yNew;
      moved = true;
    } else {
      if (!solidAt(xNew, player.y)) {
        player.x = xNew;
        moved = true;
      }
      if (!solidAt(player.x, yNew)) {
        player.y = yNew;
        moved = true;
      }
    }

    const moving = player.mov !== 0;
    const actuallyMoved = moved && (oldX !== player.x || oldY !== player.y);

    footstepCooldownMs = Math.max(0, footstepCooldownMs - dt * 1000);
    shootCooldownMs = Math.max(0, shootCooldownMs - dt * 1000);
    if (moving && actuallyMoved && footstepCooldownMs <= 0) {
      events?.onFootstep?.();
      const walkIntervalMs = 360;
      footstepCooldownMs = player.sprint ? walkIntervalMs / 4 : walkIntervalMs;
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
    const { zBuffer } = castRays({ player, getViewWidth, addRotToAngle, drawRay: renderer.drawRay });
    renderer.drawSprites(zBuffer);
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

    events?.onTick?.(dt);

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
