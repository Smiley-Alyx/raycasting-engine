import { createInput } from './input.js';
import { hitWall as hitWallState } from './map-state.js';
import { castRays } from './raycaster.js';
import { createRenderer } from './renderer.js';

export function createEngine({ ctx, getViewWidth, getViewHeight }) {
  let started = false;

  const player = {
    x: 46,
    y: 7,
    mov: 0,
    dir: 0,
    rot: -1.5,
    speed: 0.05,
    sprint: 0,
    sprintFactor: 2,
    rotSpeed: (2 * Math.PI) / 180,
    fov: (60 * Math.PI) / 180,
    flatmap: 0,
  };

  const renderer = createRenderer({ ctx, getViewWidth, getViewHeight, player });

  const input = createInput({
    onToggleMap: function () {
      player.flatmap = player.flatmap ? 0 : 1;
    },
  });

  let previousTime = Date.now();
  let lag = 0.0;
  const MS_PER_UPDATE = 1000 / 60;

  function setSpawn(spawn) {
    if (!spawn || typeof spawn !== 'object') return;
    if (typeof spawn.x === 'number') player.x = spawn.x;
    if (typeof spawn.y === 'number') player.y = spawn.y;
    if (typeof spawn.rot === 'number') player.rot = spawn.rot;
  }

  function processInput(dt) {
    player.mov = (input.isDown('KeyW') || input.isDown('ArrowUp')) ? 1 : ((input.isDown('KeyS') || input.isDown('ArrowDown')) ? -1 : 0);
    player.dir = (input.isDown('KeyA') || input.isDown('ArrowLeft')) ? 1 : ((input.isDown('KeyD') || input.isDown('ArrowRight')) ? -1 : 0);
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

  function addRotToAngle(rot, angle) {
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

    render(lag / MS_PER_UPDATE);

    requestAnimationFrame(tick);
  }

  function start() {
    if (started) return;
    started = true;
    input.bind();
    requestAnimationFrame(tick);
  }

  return {
    start,
    setSpawn,
    player,
  };
}
