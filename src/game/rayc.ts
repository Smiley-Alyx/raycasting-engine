import type { Grid, Legend, Player, Spawn } from '../types/game';
import { createEngine } from '../engine/engine';
import { getCanvas, getCanvasCssHeight, getCanvasCssWidth, getCtx } from '../canvas-init';
import { createInput } from '../input/input';
import { createRenderer } from './render/renderer';
import { AudioManager } from './audio/audio-manager';
import { DEFAULT_SFX } from './audio/sfx-config';
import { hitWall } from '../state/map-state';

type EngineInstance = ReturnType<typeof createEngine>;

type RendererInstance = ReturnType<typeof createRenderer>;

type PlayerInstance = Player;

let engine: EngineInstance | null = null;
let renderer: RendererInstance | null = null;

type Enemy = {
  x: number;
  y: number;
  alive: boolean;
  alerted: boolean;
  attackFlashMs: number;
};

let enemies: Enemy[] = [];

export function setEnemies(next: Array<{ x: number; y: number }>) {
  enemies = next.map((e) => ({ x: e.x, y: e.y, alive: true, alerted: false, attackFlashMs: 0 }));
}

function hitWallCircle(x: number, y: number, r: number): boolean {
  return hitWall(x - r, y - r) || hitWall(x + r, y - r) || hitWall(x - r, y + r) || hitWall(x + r, y + r);
}

export function getEnemies() {
  return enemies;
}

function hasLineOfSight(xFrom: number, yFrom: number, xTo: number, yTo: number): boolean {
  const dx = xTo - xFrom;
  const dy = yTo - yFrom;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.0001) return true;
  const step = 0.12;
  const nx = dx / dist;
  const ny = dy / dist;
  for (let d = 0.25; d < dist; d += step) {
    const x = xFrom + nx * d;
    const y = yFrom + ny * d;
    if (hitWall(x, y)) return false;
  }
  return true;
}

let enemyDamageCooldownMs = 0;
let enemyInSight = false;

function updateEnemies(dt: number) {
  enemyDamageCooldownMs = Math.max(0, enemyDamageCooldownMs - dt * 1000);

  let inSightNow = false;

  for (const e of enemies) {
    if (!e.alive) continue;
    e.attackFlashMs = Math.max(0, e.attackFlashMs - dt * 1000);
    const dist = Math.hypot(player.x - e.x, player.y - e.y);

    // Check if enemy is in your view (used for looping SFX).
    if (!inSightNow) {
      const maxDist = 9;
      const halfAngle = (10 * Math.PI) / 180;
      if (dist <= maxDist) {
        const angle = Math.atan2(player.y - e.y, e.x - player.x);
        let rel = angle - player.rot;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        if (Math.abs(rel) <= halfAngle && hasLineOfSight(player.x, player.y, e.x, e.y)) {
          inSightNow = true;
        }
      }
    }

    if (!e.alerted) {
      if (dist < 8 && hasLineOfSight(e.x, e.y, player.x, player.y)) {
        e.alerted = true;
      }
    }

    if (e.alerted) {
      const speed = 0.85;
      const dx = player.x - e.x;
      const dy = player.y - e.y;
      const len = Math.hypot(dx, dy) || 1;
      const step = speed * dt;
      const nx = dx / len;
      const ny = dy / len;

      const xTry = e.x + nx * step;
      const yTry = e.y + ny * step;

      const r = 0.22;

      // Simple collision: try full move, then axis moves.
      if (!hitWallCircle(xTry, yTry, r)) {
        e.x = xTry;
        e.y = yTry;
      } else if (!hitWallCircle(xTry, e.y, r)) {
        e.x = xTry;
      } else if (!hitWallCircle(e.x, yTry, r)) {
        e.y = yTry;
      }

      // Damage when close and with LoS.
      if (enemyDamageCooldownMs <= 0 && dist < 1.35 && hasLineOfSight(e.x, e.y, player.x, player.y)) {
        const dmg = 5;
        player.hp = Math.max(0, player.hp - dmg);
        audio.playSfx('damage');
        e.attackFlashMs = 220;
        renderer?.triggerDamagePulse();
        enemyDamageCooldownMs = 650;
        if (player.hp <= 0) {
          renderer?.triggerKillFill();
        }
      }
    }
  }

  // Loop enemy sound while at least one enemy is in sight.
  if (inSightNow && !enemyInSight) {
    audio.playLoopingSfx('enemy', 0.35);
  } else if (!inSightNow && enemyInSight) {
    audio.stopLoopingSfx('enemy');
  }
  enemyInSight = inSightNow;
}

function tryShootEnemies() {
  const maxDist = 10;
  const halfAngle = (3 * Math.PI) / 180;

  let best: { e: Enemy; dist: number } | null = null;

  for (const e of enemies) {
    if (!e.alive) continue;
    const dx = e.x - player.x;
    const dy = e.y - player.y;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) continue;

    const angle = Math.atan2(player.y - e.y, e.x - player.x);
    let rel = angle - player.rot;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    if (Math.abs(rel) > halfAngle) continue;
    if (!hasLineOfSight(player.x, player.y, e.x, e.y)) continue;

    if (!best || dist < best.dist) best = { e, dist };
  }

  if (best) {
    best.e.alive = false;
    renderer?.triggerKillFill();
  }
}

const audio = new AudioManager();
audio.setSfxSources(DEFAULT_SFX);

const player: PlayerInstance = {
  x: 46,
  y: 7,
  mov: 0,
  dir: 0,
  rot: -1.5,
  hp: 100,
  maxHp: 100,
  speed: 0.05,
  sprint: 0,
  sprintFactor: 2,
  rotSpeed: (2 * Math.PI) / 180,
  fov: (60 * Math.PI) / 180,
  flatmap: 0,
};

const input = createInput({
  onToggleMap: function () {
    player.flatmap = player.flatmap ? 0 : 1;
  },
});

function getViewWidth() {
  const cssWidth = getCanvasCssWidth();
  if (typeof cssWidth === 'number') return cssWidth;
  const canvas = getCanvas();
  return canvas ? canvas.width : 0;
}

function getViewHeight() {
  const cssHeight = getCanvasCssHeight();
  if (typeof cssHeight === 'number') return cssHeight;
  const canvas = getCanvas();
  return canvas ? canvas.height : 0;
}

function ensureEngine() {
  if (engine) return engine;
  const ctx = getCtx();
  if (!ctx) {
    throw new Error('Canvas context is not initialized. Did you import canvas-init first?');
  }

  renderer = createRenderer({
    ctx,
    getViewWidth,
    getViewHeight,
    player,
    getEnemies: () => enemies,
  });
  engine = createEngine({
    ctx,
    getViewWidth,
    getViewHeight,
    player,
    input,
    renderer,
    events: {
      onDoorOpen: () => {
        audio.playSfx('doorOpen');
      },
      onFootstep: () => {
        audio.playSfx('footstep');
      },
      onShoot: () => {
        audio.playSfx('shoot');
        renderer?.triggerFlash();
        tryShootEnemies();
      },
      onTick: (dt: number) => {
        updateEnemies(dt);
      },
    },
  });
  return engine;
}

export function setBackgroundColors(colors: { ceiling?: string; floor?: string }) {
  ensureEngine();
  renderer?.setBackgroundColors(colors);
}

export function triggerDeathOverlay() {
  ensureEngine();
  renderer?.triggerKillFill();
}

export function setMap(newMap: Grid) {
  ensureEngine().setMap(newMap);
}

export function setSpawn(spawn: Spawn | null) {
  if (!spawn || typeof spawn !== 'object') return;
  ensureEngine().setSpawn(spawn);
}

export function setLegend(newLegend: Legend) {
  ensureEngine().setLegend(newLegend);
}

export function setAudioConfig({
  music,
  sfx,
}: {
  music: Parameters<AudioManager['setMusic']>[0];
  sfx: Parameters<AudioManager['setSfxSources']>[0];
}) {
  audio.setMusic(music);
  audio.setSfxSources(sfx ?? DEFAULT_SFX);
}

export function unlockAudio() {
  audio.unlock();
}

export function playMusic() {
  audio.playMusic();
}

export function setMusicEnabled(enabled: boolean) {
  audio.setMusicEnabled(enabled);
}

export function setSfxEnabled(enabled: boolean) {
  audio.setSfxEnabled(enabled);
}

export function setMusicVolume(volume: number) {
  audio.setMusicVolume(volume);
}

export function setSfxVolume(volume: number) {
  audio.setSfxVolume(volume);
}

export function getAudioState() {
  return {
    musicEnabled: audio.getMusicEnabled(),
    sfxEnabled: audio.getSfxEnabled(),
    musicVolume: audio.getMusicVolume(),
    sfxVolume: audio.getSfxVolume(),
  };
}

export function startRayc() {
  ensureEngine().start();
}

export function stopRayc() {
  if (!engine) return;
  engine.stop();
}

export function disposeRayc() {
  if (!engine) return;
  engine.dispose();
  engine = null;
}

export function getPlayer() {
  return player;
}
