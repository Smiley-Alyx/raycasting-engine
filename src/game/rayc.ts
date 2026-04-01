import type { Grid, Legend, Player, Spawn } from '../types/game';
import { createEngine } from '../engine/engine';
import { getCanvas, getCanvasCssHeight, getCanvasCssWidth, getCtx } from '../canvas-init';
import { createInput } from '../input/input';
import { createRenderer } from './render/renderer';
import { AudioManager } from './audio/audio-manager';
import { DEFAULT_SFX } from './audio/sfx-config';

type EngineInstance = ReturnType<typeof createEngine>;

type PlayerInstance = Player;

let engine: EngineInstance | null = null;

const audio = new AudioManager();
audio.setSfxSources(DEFAULT_SFX);

const player: PlayerInstance = {
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

  const renderer = createRenderer({ ctx, getViewWidth, getViewHeight, player });
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
    },
  });
  return engine;
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
