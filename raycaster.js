import { getCellMaterial, getMap, hitWall } from './map-state.js';

export function castRays({ player, getViewWidth, addRotToAngle, drawRay }) {
  const map = getMap();
  if (!map) return;

  const viewWidth = getViewWidth();
  const angleBetweenRays = ((player.fov * 180) / Math.PI / viewWidth) * (Math.PI / 180);

  let angle = addRotToAngle(player.fov / 2, player.rot);
  for (let i = 0; i < viewWidth; i++) {
    castSingleRay({ player, map, angle, row: i, drawRay });
    angle = addRotToAngle(-angleBetweenRays, angle);
  }
}

function castSingleRay({ player, map, angle, row, drawRay }) {
  const facingRight = angle < (90 * Math.PI) / 180 || angle > (270 * Math.PI) / 180;
  const facingUp = angle < (180 * Math.PI) / 180;

  let x = 0;
  let y = 0;
  let dX = 0;
  let dY = 0;
  let xMap = 0;
  let yMap = 0;

  let dist = 0;
  let img = 0;
  let offset = 0;

  // По горизонтали
  let slope = 1 / (Math.sin(-angle) / Math.cos(-angle));
  y = facingUp ? Math.floor(player.y) : Math.ceil(player.y);
  x = player.x + (y - player.y) * slope;

  dY = facingUp ? -1 : 1;
  dX = dY * slope;

  let distH = Infinity;
  let xHitH = 0;
  let yHitH = 0;
  let imgH = 0;
  let offsetH = 0;

  while (x >= 0 && x < map[0].length && y >= 0 && y < map.length) {
    yMap = Math.floor(y + (facingUp ? -1 : 0));
    xMap = Math.floor(x);

    if (hitWall(xMap, yMap)) {
      distH = Math.abs((player.x - x) / Math.cos(angle));
      xHitH = x;
      yHitH = y;
      offsetH = x % 1;
      imgH = getCellMaterial(xMap, yMap);
      break;
    }

    x += dX;
    y += dY;
  }

  // По вертикали
  slope = Math.sin(-angle) / Math.cos(-angle);
  x = facingRight ? Math.ceil(player.x) : Math.floor(player.x);
  y = player.y + (x - player.x) * slope;
  dX = facingRight ? 1 : -1;
  dY = dX * slope;

  let distV = Infinity;
  let xHitV = 0;
  let yHitV = 0;
  let imgV = 0;
  let offsetV = 0;

  while (x >= 0 && x < map[0].length && y >= 0 && y < map.length) {
    xMap = Math.floor(x + (facingRight ? 0 : -1));
    yMap = Math.floor(y);

    if (hitWall(xMap, yMap)) {
      distV = Math.abs((player.y - y) / Math.sin(angle));
      xHitV = x;
      yHitV = y;
      offsetV = y % 1;
      imgV = getCellMaterial(xMap, yMap);
      break;
    }

    x += dX;
    y += dY;
  }

  if (distV < distH) {
    x = xHitV;
    y = yHitV;
    dist = distV;
    img = imgV;
    offset = offsetV;
  } else {
    x = xHitH;
    y = yHitH;
    dist = distH;
    img = imgH;
    offset = offsetH;
  }

  dist = dist * Math.cos(player.rot - angle);
  drawRay(dist, row, offset, img);
}
