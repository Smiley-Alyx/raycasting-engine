export type MusicConfig = {
  src: string;
  loop?: boolean;
  volume?: number;
};

export type SfxKey = 'doorOpen' | 'footstep' | 'shoot';

export class AudioManager {
  private unlocked = false;

  private musicEnabled = true;
  private sfxEnabled = true;

  private musicVolume = 0.5;
  private sfxVolume = 0.7;

  private musicEl: HTMLAudioElement | null = null;
  private musicConfig: MusicConfig | null = null;

  private sfxSrcByKey: Partial<Record<SfxKey, string>> = {};

  unlock() {
    if (this.unlocked) return;
    this.unlocked = true;

    if (this.musicEl) {
      this.musicEl.muted = true;
      void this.musicEl
        .play()
        .catch(() => {
          // ignore autoplay restrictions
        })
        .finally(() => {
          if (this.musicEl) {
            this.musicEl.pause();
            this.musicEl.currentTime = 0;
            this.musicEl.muted = false;
          }
        });
    }
  }

  getMusicEnabled() {
    return this.musicEnabled;
  }

  setMusicEnabled(enabled: boolean) {
    this.musicEnabled = enabled;
    if (!enabled) {
      this.stopMusic();
    } else {
      this.playMusic();
    }
  }

  getSfxEnabled() {
    return this.sfxEnabled;
  }

  setSfxEnabled(enabled: boolean) {
    this.sfxEnabled = enabled;
  }

  getMusicVolume() {
    return this.musicVolume;
  }

  setMusicVolume(volume: number) {
    const v = Math.max(0, Math.min(1, volume));
    this.musicVolume = v;
    this.applyMusicVolume();
  }

  getSfxVolume() {
    return this.sfxVolume;
  }

  setSfxVolume(volume: number) {
    const v = Math.max(0, Math.min(1, volume));
    this.sfxVolume = v;
  }

  private applyMusicVolume() {
    if (!this.musicEl) return;
    const base = this.musicConfig?.volume ?? 0.5;
    this.musicEl.volume = Math.max(0, Math.min(1, base * this.musicVolume));
  }

  setMusic(config: MusicConfig | null) {
    this.musicConfig = config;

    if (!config) {
      if (this.musicEl) {
        this.musicEl.pause();
        this.musicEl.src = '';
        this.musicEl = null;
      }
      return;
    }

    if (!this.musicEl) {
      this.musicEl = new Audio();
    }

    this.musicEl.src = config.src;
    this.musicEl.loop = config.loop ?? true;
    this.applyMusicVolume();
  }

  playMusic() {
    if (!this.musicEl || !this.musicConfig) return;
    if (!this.unlocked) return;
    if (!this.musicEnabled) return;
    void this.musicEl.play().catch(() => {
      // ignore
    });
  }

  stopMusic() {
    if (!this.musicEl) return;
    this.musicEl.pause();
    this.musicEl.currentTime = 0;
  }

  setSfxSources(sources: Partial<Record<SfxKey, string>> | null) {
    this.sfxSrcByKey = sources ?? {};
  }

  playSfx(key: SfxKey, volume = 0.7) {
    if (!this.unlocked) return;
    if (!this.sfxEnabled) return;
    const src = this.sfxSrcByKey[key];
    if (!src) return;

    const el = new Audio(src);
    el.volume = Math.max(0, Math.min(1, volume * this.sfxVolume));
    void el.play().catch(() => {
      // ignore
    });
  }
}
