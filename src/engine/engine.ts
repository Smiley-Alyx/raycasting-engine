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
};

type EngineEvents = {
  onDoorOpen?: (xMap: number, yMap: number) => void;
  onFootstep?: () => void;
  onShoot?: () => void;
  onEnemyKilled?: (xMap: number, yMap: number) => void;
  onPlayerDamaged?: (amount: number) => void;
  onPlayerDied?: () => void;
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
  let prevShootDown = false;

  let footstepCooldownMs = 0;
  let shootCooldownMs = 0;
  let enemyDamageCooldownMs = 0;

  function setSpawn(spawn: Spawn | null) {
    if (!spawn || typeof spawn !== 'object') return;
    if (typeof spawn.x === 'number') player.x = spawn.x;
    if (typeof spawn.y === 'number') player.y = spawn.y;
    if (typeof spawn.rot === 'number') player.rot = spawn.rot;
  }

  function tryShoot() {
    const maxDist = 8;
    const step = 0.05;

    for (let d = 0; d <= maxDist; d += step) {
      const xProbe = player.x + d * Math.cos(player.rot);
      const yProbe = player.y - d * Math.sin(player.rot);
      const xMap = Math.floor(xProbe);
      const yMap = Math.floor(yProbe);

      if (!hitWallState(xProbe, yProbe)) continue;

      const mat = getCellMaterial(xMap, yMap);
      if (mat === 'enemy') {
        setCell(xMap, yMap, 0);
        events?.onEnemyKilled?.(xMap, yMap);
      }

      return;
    }
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
      tryShoot();
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

    if (!hitWallState(xNew, yNew)) {
      player.x = xNew;
      player.y = yNew;
    }

    const moving = player.mov !== 0;
    const actuallyMoved = !hitWallState(xNew, yNew) && (oldX !== player.x || oldY !== player.y);

    footstepCooldownMs = Math.max(0, footstepCooldownMs - dt * 1000);
    shootCooldownMs = Math.max(0, shootCooldownMs - dt * 1000);
    enemyDamageCooldownMs = Math.max(0, enemyDamageCooldownMs - dt * 1000);
    if (moving && actuallyMoved && footstepCooldownMs <= 0) {
      events?.onFootstep?.();
      const walkIntervalMs = 360;
      footstepCooldownMs = player.sprint ? walkIntervalMs / 4 : walkIntervalMs;
    }

    // Simple enemy damage: if an enemy has line of sight to the player, apply periodic damage.
    if (enemyDamageCooldownMs <= 0) {
      const dmg = computeEnemyDamage();
      if (dmg > 0) {
        player.hp = Math.max(0, player.hp - dmg);
        events?.onPlayerDamaged?.(dmg);
        enemyDamageCooldownMs = 650;
        if (player.hp <= 0) {
          events?.onPlayerDied?.();
        }
      }
    }
  }

  function hasLineOfSight(xFrom: number, yFrom: number, xTo: number, yTo: number): boolean {
    const dx = xTo - xFrom;
    const dy = yTo - yFrom;
    const dist = Math.hypot(dx, dy);
    if (dist <= 0.0001) return true;
    const step = 0.08;
    const nx = dx / dist;
    const ny = dy / dist;

    for (let d = 0.2; d < dist; d += step) {
      const x = xFrom + nx * d;
      const y = yFrom + ny * d;
      if (!hitWallState(x, y)) continue;
      const mat = getCellMaterial(Math.floor(x), Math.floor(y));
      if (mat === 'enemy') continue;
      return false;
    }
    return true;
  }

  function computeEnemyDamage(): number {
    // Scan a small neighborhood around the player.
    const r = 6;
    const x0 = Math.floor(player.x);
    const y0 = Math.floor(player.y);

    for (let y = y0 - r; y <= y0 + r; y++) {
      for (let x = x0 - r; x <= x0 + r; x++) {
        const mat = getCellMaterial(x, y);
        if (mat !== 'enemy') continue;
        const ex = x + 0.5;
        const ey = y + 0.5;
        const dist = Math.hypot(player.x - ex, player.y - ey);
        if (dist > 6) continue;
        if (!hasLineOfSight(ex, ey, player.x, player.y)) continue;
        return 5;
      }
    }
    return 0;
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
