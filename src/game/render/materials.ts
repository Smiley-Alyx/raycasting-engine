const textureById: Map<number, string> = new Map([
  [1, 'wall'],
  [2, 'window'],
  [3, 'door'],
  [4, 'stand1'],
  [5, 'stand2'],
  [6, 'stand3'],
  [7, 'stand4'],
  [8, 'GStand1'],
  [9, 'GStand2'],
]);

const materialToTextureId: Map<string, number> = new Map([
  ['wall', 1],
  ['brick', 1],
  ['window', 2],
  ['door', 3],
  ['stand1', 4],
  ['stand2', 5],
  ['stand3', 6],
  ['stand4', 7],
  ['gstand1', 8],
  ['gstand2', 9],
]);

const cache: Map<string, HTMLImageElement | null> = new Map();

function getDomTextureByNumericId(id: number): HTMLImageElement | null {
  const domId = textureById.get(id);
  if (!domId) return null;

  const cached = cache.get(domId);
  if (cached !== undefined) return cached;

  const el = document.getElementById(domId);
  const img = el instanceof HTMLImageElement ? el : null;
  cache.set(domId, img);
  return img;
}

export function getTextureForMaterial(
  materialOrId: string | number,
): HTMLImageElement | null {
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
