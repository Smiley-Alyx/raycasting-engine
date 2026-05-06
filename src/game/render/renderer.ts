import type { Player } from '../../types/game';
import { getMap } from '../../state/map-state';
import { getTextureForMaterial } from './materials';

export function createRenderer({
  ctx,
  getViewWidth,
  getViewHeight,
  player,
  getEnemies,
}: {
  ctx: CanvasRenderingContext2D;
  getViewWidth: () => number;
  getViewHeight: () => number;
  player: Player;
  getEnemies?: () => Array<{ x: number; y: number; alive: boolean; attackFlashMs?: number }>;
}) {
  let ceilingColor = '#E3E3E1';
  let floorColor = '#858585';

  let flash = 0;
  let damagePulse = 0;
  let killFill = 0;
  let killFillTarget = 0;

  function setBackgroundColors(colors: { ceiling?: string; floor?: string }) {
    if (typeof colors.ceiling === 'string') ceilingColor = colors.ceiling;
    if (typeof colors.floor === 'string') floorColor = colors.floor;
  }

  function drawBackground() {
    const w = getViewWidth();
    const h = getViewHeight();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = ceilingColor;
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = floorColor;
    ctx.fillRect(0, h / 2, w, h / 2);

    // Subtle vertical shading to avoid a flat look.
    ctx.save();
    const topShade = ctx.createLinearGradient(0, 0, 0, h / 2);
    topShade.addColorStop(0, 'rgba(0,0,0,0.22)');
    topShade.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = topShade;
    ctx.fillRect(0, 0, w, h / 2);

    const bottomShade = ctx.createLinearGradient(0, h / 2, 0, h);
    bottomShade.addColorStop(0, 'rgba(0,0,0,0)');
    bottomShade.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = bottomShade;
    ctx.fillRect(0, h / 2, w, h / 2);

    // Light vignette.
    const vignette = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.25,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.75,
    );
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);

    if (flash > 0) {
      ctx.fillStyle = `rgba(255,255,255,${Math.min(0.18, flash)})`;
      ctx.fillRect(0, 0, w, h);
      flash = Math.max(0, flash - 0.06);
    }

    if (damagePulse > 0) {
      ctx.fillStyle = `rgba(120,0,0,${Math.min(0.35, damagePulse)})`;
      ctx.fillRect(0, 0, w, h);
      damagePulse = Math.max(0, damagePulse - 0.03);
    }

    // Slow red fill after enemy kill.
    if (killFillTarget > 0) {
      killFillTarget = Math.max(0, killFillTarget - 0.004);
    }
    if (killFill < killFillTarget) {
      killFill = Math.min(killFillTarget, killFill + 0.01);
    } else if (killFill > killFillTarget) {
      killFill = Math.max(killFillTarget, killFill - 0.006);
    }
    if (killFill > 0) {
      ctx.fillStyle = `rgba(120,0,0,${Math.min(0.6, killFill)})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  function triggerFlash() {
    flash = 0.22;
  }

  function triggerDamagePulse() {
    damagePulse = Math.max(damagePulse, 0.28);
  }

  function triggerKillFill() {
    killFillTarget = Math.min(0.55, killFillTarget + 0.35);
  }

  function drawRay(dist: number, x: number, offset: number, img: string | number) {
    const viewWidth = getViewWidth();
    const viewHeight = getViewHeight();
    const distanceProjectionPlane = viewWidth / 2 / Math.tan(player.fov / 2);
    const sliceHeight = (1 / dist) * distanceProjectionPlane;

    const texture = getTextureForMaterial(img);
    if (!texture) return;

    let texX = Math.floor(offset * 512);
    if (texX < 0) texX = 0;
    if (texX > 511) texX = 511;

    ctx.drawImage(texture, texX, 0, 1, 512, x, viewHeight / 2 - sliceHeight / 2, 1, sliceHeight);
  }

  function drawSprites(zBuffer: Float64Array) {
    const enemies = typeof getEnemies === 'function' ? getEnemies() : [];
    if (!enemies.length) return;

    const w = getViewWidth();
    const h = getViewHeight();

    const texture = getTextureForMaterial('enemy');
    if (!texture) return;

    const distanceProjectionPlane = w / 2 / Math.tan(player.fov / 2);

    const list = enemies
      .filter((e) => e.alive)
      .map((e) => {
        const dx = e.x - player.x;
        const dy = e.y - player.y;
        const dist = Math.hypot(dx, dy);
        // World uses y down; player forward is (cos(rot), -sin(rot)).
        const angle = Math.atan2(player.y - e.y, e.x - player.x);
        let rel = angle - player.rot;
        rel = Math.atan2(Math.sin(rel), Math.cos(rel));
        return { e, dist, rel };
      })
      // back-to-front
      .sort((a, b) => b.dist - a.dist);

    for (const item of list) {
      if (item.dist <= 0.001) continue;
      if (Math.abs(item.rel) > player.fov / 2 + 0.2) continue;

      const spriteHeight = (1 / item.dist) * distanceProjectionPlane;
      const spriteWidth = spriteHeight;
      const screenX = (0.5 + item.rel / player.fov) * w;
      const x0 = Math.floor(screenX - spriteWidth / 2);
      const x1 = Math.floor(screenX + spriteWidth / 2);
      const y0 = Math.floor(h / 2 - spriteHeight / 2);

      const texW = texture.width || 1;
      const texH = texture.height || 1;

      for (let x = x0; x <= x1; x++) {
        if (x < 0 || x >= w) continue;
        const z = zBuffer[x];
        if (z !== 0 && item.dist > z) continue;

        const u = (x - x0) / Math.max(1, x1 - x0);
        const sx = Math.floor(u * texW);
        ctx.drawImage(texture, sx, 0, 1, texH, x, y0, 1, spriteHeight);
      }

      const flashMs = item.e.attackFlashMs ?? 0;
      if (flashMs > 0) {
        const t = Math.max(0, Math.min(1, flashMs / 220));
        ctx.save();
        ctx.strokeStyle = `rgba(255, 50, 50, ${0.25 + 0.6 * t})`;
        ctx.lineWidth = Math.max(1, Math.floor(spriteWidth * 0.02));
        ctx.shadowColor = `rgba(255, 0, 0, ${0.35 + 0.5 * t})`;
        ctx.shadowBlur = Math.max(2, Math.floor(spriteWidth * 0.18));
        ctx.strokeRect(x0 + 0.5, y0 + 0.5, Math.max(1, x1 - x0), Math.max(1, spriteHeight));
        ctx.restore();
      }
    }
  }

  function drawMap() {
    const map = getMap();
    if (!map) return;

    ctx.fillStyle = 'rgb(255, 255, 255)';
    ctx.fillRect(0, 0, map[0].length * 5, map.length * 5);
    ctx.fillStyle = 'rgb(255, 0, 0)';
    ctx.fillRect(player.x * 5 - 1, player.y * 5 - 1, 2, 2);

    for (let y = 0; y < map.length; y++) {
      for (let x = 0; x < map[y].length; x++) {
        if (map[y][x] > 0) {
          ctx.fillStyle = 'rgb(0, 0, 0)';
          ctx.fillRect(x * 5, y * 5, 5, 5);
        }
      }
    }
  }

  return {
    drawBackground,
    drawRay,
    drawMap,
    drawSprites,
    setBackgroundColors,
    triggerFlash,
    triggerDamagePulse,
    triggerKillFill,
  };
}
