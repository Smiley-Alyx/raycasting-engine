export function createInput(
  {
    onToggleMap,
  }: {
    onToggleMap?: (() => void) | null;
  } = {},
) {
  const keysDown: Record<string, boolean> = Object.create(null);

  let bound = false;
  let onKeyDown: ((e: KeyboardEvent) => void) | null = null;
  let onKeyUp: ((e: KeyboardEvent) => void) | null = null;

  function bind() {
    if (bound) return;
    bound = true;

    onKeyDown = function (e: KeyboardEvent) {
      if (
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
      ) {
        e.preventDefault();
      }

      if (!e.repeat) {
        if (e.code === 'KeyM' && typeof onToggleMap === 'function') {
          onToggleMap();
        }
      }

      keysDown[e.code] = true;
    };

    onKeyUp = function (e: KeyboardEvent) {
      if (
        e.code === 'ArrowUp' ||
        e.code === 'ArrowDown' ||
        e.code === 'ArrowLeft' ||
        e.code === 'ArrowRight'
      ) {
        e.preventDefault();
      }

      keysDown[e.code] = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
  }

  function unbind() {
    if (!bound) return;
    bound = false;

    if (onKeyDown) window.removeEventListener('keydown', onKeyDown);
    if (onKeyUp) window.removeEventListener('keyup', onKeyUp);

    onKeyDown = null;
    onKeyUp = null;
  }

  function isDown(code: string): boolean {
    return !!keysDown[code];
  }

  return {
    bind,
    unbind,
    isDown,
  };
}
