type AtlasSlice = { domId: string; tile: number };

const textureById = new Map<number, string | AtlasSlice>([
  [1, { domId: 'wallAtlas', tile: 0 }],
  [2, { domId: 'windowAtlas', tile: 0 }],
  [3, { domId: 'doorAtlas', tile: 0 }],
  [4, { domId: 'standAtlas', tile: 0 }],
  [10, 'enemy'],
]);

const materialToTextureId: Map<string, number> = new Map([
  ['wall', 1],
  ['window', 2],
  ['door', 3],
  ['stand', 4],
  ['enemy', 10],
]);

const cache: Map<string, CanvasImageSource | null> = new Map();

function getDomTextureByNumericId(id: number): CanvasImageSource | null {
  const entry = textureById.get(id);
  if (!entry) return null;

  const key = typeof entry === 'string' ? entry : `${entry.domId}#${entry.tile}`;
  const cached = cache.get(key);
  if (cached !== undefined) return cached;

  if (typeof entry === 'string') {
    const el = document.getElementById(entry);
    const img = el instanceof HTMLImageElement ? el : null;
    cache.set(key, img);
    return img;
  }

  const baseEl = document.getElementById(entry.domId);
  const baseImg = baseEl instanceof HTMLImageElement ? baseEl : null;
  if (!baseImg || baseImg.naturalWidth <= 0 || baseImg.naturalHeight <= 0) {
    cache.set(key, null);
    return null;
  }

  const cols = 4;
  const rows = 4;
  const tileW = Math.floor(baseImg.naturalWidth / cols);
  const tileH = Math.floor(baseImg.naturalHeight / rows);
  const tx = entry.tile % cols;
  const ty = Math.floor(entry.tile / cols);

  const canvas = document.createElement('canvas');
  canvas.width = tileW;
  canvas.height = tileH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    cache.set(key, null);
    return null;
  }
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(baseImg, tx * tileW, ty * tileH, tileW, tileH, 0, 0, tileW, tileH);

  cache.set(key, canvas);
  return canvas;
}

export function getTextureForMaterial(
  materialOrId: string | number,
): CanvasImageSource | null {
  if (typeof materialOrId === 'number') {
    return getDomTextureByNumericId(materialOrId);
  }

  if (typeof materialOrId === 'string') {
    const textureId = materialToTextureId.get(materialOrId);
    if (!textureId) return null;
    return getDomTextureByNumericId(textureId);
  }

  return null;
}
