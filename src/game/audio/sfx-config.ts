import type { SfxKey } from './audio-manager';

const base = new URL(import.meta.env.BASE_URL, window.location.origin);

function url(path: string) {
  return path.startsWith('/') ? new URL(path.slice(1), base).toString() : new URL(path, base).toString();
}

export const DEFAULT_SFX: Partial<Record<SfxKey, string>> = {
  doorOpen: url('/audio/sfx/door.wav'),
  footstep: url('/audio/sfx/step.wav'),
  shoot: url('/audio/sfx/shoot.wav'),
} as const;
