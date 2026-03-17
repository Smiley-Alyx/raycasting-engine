export async function loadLevel(levelUrl) {
  const res = await fetch(levelUrl);
  if (!res.ok) {
    throw new Error('Failed to load level: ' + levelUrl);
  }

  const data = await res.json();

  if (!data || !Array.isArray(data.rows) || data.rows.length === 0) {
    throw new Error('Invalid level format: missing rows');
  }

  // Нормализация: редактор/ручное редактирование может привести к разной длине строк.
  // Для движка нужна прямоугольная сетка, поэтому короткие строки дополняем нулями справа.
  let width = 0;
  for (let y = 0; y < data.rows.length; y++) {
    if (typeof data.rows[y] !== 'string') {
      throw new Error('Invalid level format: each row must be a string');
    }
    width = Math.max(width, data.rows[y].length);
  }
  const normalizedRows = data.rows.map((row) => row.padEnd(width, '0'));

  // Преобразуем rows (строки) в числовую сетку (как ожидает текущий движок).
  const grid = normalizedRows.map((row) => {
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

  const spawn = data.spawn && typeof data.spawn === 'object' ? data.spawn : null;

  return {
    id: data.id,
    name: data.name,
    legend: data.legend || {},
    grid,
    spawn,
  };
}

export async function loadLevelsIndex(indexUrl) {
  const res = await fetch(indexUrl);
  if (!res.ok) {
    throw new Error('Failed to load levels index: ' + indexUrl);
  }

  const data = await res.json();
  if (!data || !Array.isArray(data.levels) || typeof data.default !== 'string') {
    throw new Error('Invalid levels index format');
  }

  return data;
}
