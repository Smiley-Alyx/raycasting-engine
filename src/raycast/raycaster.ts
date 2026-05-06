import type { Player } from '../types/game';
import { getCellMaterial, getMap, hitWall } from '../state/map-state';

type AddRotToAngle = (rot: number, angle: number) => number;
type DrawRay = (dist: number, x: number, offset: number, img: string | number) => void;

type WallFace = 'N' | 'S' | 'E' | 'W';

type AtlasKind = 'wall' | 'door' | 'stand';

function getAtlasKind(m: string | number): AtlasKind | null {
  if (m === 'wall' || m === 'brick' || m === 1) return 'wall';
  if (m === 'door' || m === 6 || m === 3) return 'door';
  if (m === 'stand' || m === 4) return 'stand';
  return null;
}

function encodeAtlasTextureId(kind: AtlasKind, tile: number): number {
  const t = ((tile % 16) + 16) % 16;
  if (kind === 'wall') return 100 + t;
  if (kind === 'door') return 200 + t;
  return 300 + t;
}

function getAtlasVariantTextureId({
  map,
  xMap,
  yMap,
  face,
  isVerticalHit,
  kind,
}: {
  map: number[][];
  xMap: number;
  yMap: number;
  face: WallFace;
  isVerticalHit: boolean;
  kind: AtlasKind;
}): number {
  // Determine "corridor" as a continuous segment of same-kind cells along the axis
  // perpendicular to the hit normal. Within a segment, texture is constant.
  // Neighboring parallel segments alternate using x/y parity to reduce repeats.

  const w = map[0]?.length ?? 0;
  const h = map.length;

  const isSameKind = (x: number, y: number) => {
    if (x < 0 || x >= w || y < 0 || y >= h) return false;
    const m = getCellMaterial(x, y);
    return getAtlasKind(m) === kind;
  };

  let segStart = 0;
  if (isVerticalHit) {
    // Vertical hit => wall face is E/W, segment extends along Y.
    segStart = yMap;
    while (segStart > 0 && isSameKind(xMap, segStart - 1)) segStart--;

    const parity = Math.abs(xMap) % 2;
    const salt = kind === 'door' ? 101 : kind === 'stand' ? 203 : 307;
    const base = Math.abs(segStart * 7 + (face === 'W' ? 13 : 29) + salt) % 16;
    const tile = parity === 0 ? base : (base + 1) % 16;
    return encodeAtlasTextureId(kind, tile);
  }

  // Horizontal hit => wall face is N/S, segment extends along X.
  segStart = xMap;
  while (segStart > 0 && isSameKind(segStart - 1, yMap)) segStart--;

  const parity = Math.abs(yMap) % 2;
  const salt = kind === 'door' ? 101 : kind === 'stand' ? 203 : 307;
  const base = Math.abs(segStart * 7 + (face === 'S' ? 17 : 31) + salt) % 16;
  const tile = parity === 0 ? base : (base + 1) % 16;
  return encodeAtlasTextureId(kind, tile);
}

export function castRays({
  player,
  getViewWidth,
  addRotToAngle,
  drawRay,
}: {
  player: Player;
  getViewWidth: () => number;
  addRotToAngle: AddRotToAngle;
  drawRay: DrawRay;
}): { zBuffer: Float64Array } {
  const map = getMap();
  if (!map) return { zBuffer: new Float64Array(0) };

  const viewWidth = getViewWidth();
  const zBuffer = new Float64Array(viewWidth);
  const angleBetweenRays = ((player.fov * 180) / Math.PI / viewWidth) * (Math.PI / 180);

  let angle = addRotToAngle(player.fov / 2, player.rot);
  for (let i = 0; i < viewWidth; i++) {
    zBuffer[i] = castSingleRay({ player, map, angle, row: i, drawRay });
    angle = addRotToAngle(-angleBetweenRays, angle);
  }

  return { zBuffer };
}

function castSingleRay({
  player,
  map,
  angle,
  row,
  drawRay,
}: {
  player: Player;
  map: number[][];
  angle: number;
  row: number;
  drawRay: DrawRay;
}) {
  const facingRight = angle < (90 * Math.PI) / 180 || angle > (270 * Math.PI) / 180;
  const facingUp = angle < (180 * Math.PI) / 180;

  let x = 0;
  let y = 0;
  let dX = 0;
  let dY = 0;
  let xMap = 0;
  let yMap = 0;

  let dist = 0;
  let img: string | number = 0;
  let offset = 0;

  let hitXMapH = 0;
  let hitYMapH = 0;
  let hitXMapV = 0;
  let hitYMapV = 0;

  // По горизонтали
  let slope = 1 / (Math.sin(-angle) / Math.cos(-angle));
  y = facingUp ? Math.floor(player.y) : Math.ceil(player.y);
  x = player.x + (y - player.y) * slope;

  dY = facingUp ? -1 : 1;
  dX = dY * slope;

  let distH = Infinity;
  let xHitH = 0;
  let yHitH = 0;
  let imgH: string | number = 0;
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
      hitXMapH = xMap;
      hitYMapH = yMap;
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
  let imgV: string | number = 0;
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
      hitXMapV = xMap;
      hitYMapV = yMap;
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

    const kind = getAtlasKind(img);
    if (kind) {
      const face: WallFace = facingRight ? 'W' : 'E';
      img = getAtlasVariantTextureId({ map, xMap: hitXMapV, yMap: hitYMapV, face, isVerticalHit: true, kind });
    }
  } else {
    x = xHitH;
    y = yHitH;
    dist = distH;
    img = imgH;
    offset = offsetH;

    const kind = getAtlasKind(img);
    if (kind) {
      const face: WallFace = facingUp ? 'S' : 'N';
      img = getAtlasVariantTextureId({ map, xMap: hitXMapH, yMap: hitYMapH, face, isVerticalHit: false, kind });
    }
  }

  dist = dist * Math.cos(player.rot - angle);
  drawRay(dist, row, offset, img);

  return dist;
}
