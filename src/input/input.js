export function createInput({ onToggleMap } = {}) {
  const keysDown = Object.create(null);

  let bound = false;
  let onKeyDown = null;
  let onKeyUp = null;

  function bind() {
    if (bound) return;
    bound = true;

    onKeyDown = function (e) {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
        e.preventDefault();
      }

      if (!e.repeat) {
        if (e.code === 'KeyM' && typeof onToggleMap === 'function') {
          onToggleMap();
        }
      }

      keysDown[e.code] = true;
    };

    onKeyUp = function (e) {
      if (e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') {
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

    window.removeEventListener('keydown', onKeyDown);
    window.removeEventListener('keyup', onKeyUp);

    onKeyDown = null;
    onKeyUp = null;
  }

  function isDown(code) {
    return !!keysDown[code];
  }

  return {
    bind,
    unbind,
    isDown,
  };
}
