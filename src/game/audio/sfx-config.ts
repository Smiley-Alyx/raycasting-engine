import type { SfxKey } from './audio-manager';

export const DEFAULT_SFX: Partial<Record<SfxKey, string>> = {
  doorOpen: '/audio/sfx/door.wav',
  footstep: '/audio/sfx/step.wav',
  shoot: '/audio/sfx/shoot.wav',
};
