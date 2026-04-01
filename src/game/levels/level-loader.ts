import type { Legend, Spawn } from '../../types/game';

type LevelJson = {
  id?: string;
  name?: string;
  legend?: Legend;
  rows: string[];
  spawn?: unknown;
};

type LevelsIndexJson = {
  levels: Array<{ id: string; file: string }>;
  default: string;
};

export async function loadLevel(levelUrl: string) {
  const res = await fetch(levelUrl);
  if (!res.ok) {
    throw new Error('Failed to load level: ' + levelUrl);
  }

  const data: LevelJson = await res.json();

  if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
    throw new Error('Invalid level format: missing rows');
  }

  let width = 0;
  for (let y = 0; y < data.rows.length; y++) {
    if (typeof data.rows[y] !== 'string') {
      throw new Error('Invalid level format: each row must be a string');
    }
    width = Math.max(width, data.rows[y].length);
  }
  const normalizedRows = data.rows.map((row: string) => row.padEnd(width, '0'));

  const grid = normalizedRows.map((row: string) => {
    const arr = new Array(row.length);
    for (let i = 0; i < row.length; i++) {
      const code = row.charCodeAt(i) - 48;
      if (code < 0 || code > 9) {
        throw new Error('Invalid cell value at row: only 0-9 supported for now');
      }
      arr[i] = code;
    }
    return arr;
  });

  let spawn: Spawn | null = null;
  if (data.spawn && typeof data.spawn === 'object') {
    const maybe = data.spawn as { x?: unknown; y?: unknown; rot?: unknown };
    if (typeof maybe.x === 'number' && typeof maybe.y === 'number') {
      spawn = {
        x: maybe.x,
        y: maybe.y,
        rot: typeof maybe.rot === 'number' ? maybe.rot : undefined,
      };
    }
  }

  return {
    id: data.id,
    name: data.name,
    legend: data.legend ?? {},
    grid,
    spawn,
  };
}

export async function loadLevelsIndex(indexUrl: string) {
  const res = await fetch(indexUrl);
  if (!res.ok) {
    throw new Error('Failed to load levels index: ' + indexUrl);
  }

  const data: LevelsIndexJson = await res.json();
  if (!data || !Array.isArray(data.levels) || typeof data.default !== 'string') {
    throw new Error('Invalid levels index format');
  }

  return data;
}
