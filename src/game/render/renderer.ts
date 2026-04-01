import type { Player } from '../../types/game';
import { getMap } from '../../state/map-state';
import { getTextureForMaterial } from './materials';

export function createRenderer({
  ctx,
  getViewWidth,
  getViewHeight,
  player,
}: {
  ctx: CanvasRenderingContext2D;
  getViewWidth: () => number;
  getViewHeight: () => number;
  player: Player;
}) {
  function drawBackground() {
    const w = getViewWidth();
    const h = getViewHeight();

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#E3E3E1';
    ctx.fillRect(0, 0, w, h / 2);
    ctx.fillStyle = '#858585';
    ctx.fillRect(0, h / 2, w, h / 2);
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
  };
}
