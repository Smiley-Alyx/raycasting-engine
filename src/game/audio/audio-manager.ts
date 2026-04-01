export type MusicConfig = {
  src: string;
  loop?: boolean;
  volume?: number;
};

export type SfxKey = 'doorOpen' | 'footstep' | 'shoot';

export class AudioManager {
  private unlocked = false;

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
    this.musicEl.volume = config.volume ?? 0.5;
  }

  playMusic() {
    if (!this.musicEl || !this.musicConfig) return;
    if (!this.unlocked) return;
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
    const src = this.sfxSrcByKey[key];
    if (!src) return;

    const el = new Audio(src);
    el.volume = volume;
    void el.play().catch(() => {
      // ignore
    });
  }
}
