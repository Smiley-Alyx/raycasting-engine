(() => {
  const host = document.getElementById('canvas1');
  if (!host) {
    throw new Error('Missing #canvas1 element');
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';

  host.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context');
  }

  // Адаптация под разные разрешения и HiDPI.
  // canvas.width/height задаём в device-пикселях, а логический размер (CSS px)
  // сохраняем отдельно, чтобы движок мог продолжать работать в "нормальных" пикселях.
  const resizeCanvas = () => {
    const sidebarWidth = 200;
    const topOffset = 37;

    const cssWidth = Math.max(1, window.innerWidth - sidebarWidth);
    const cssHeight = Math.max(1, window.innerHeight - topOffset);
    const dpr = window.devicePixelRatio || 1;

    window.canvasCssWidth = cssWidth;
    window.canvasCssHeight = cssHeight;

    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';

    canvas.width = Math.floor(cssWidth * dpr);
    canvas.height = Math.floor(cssHeight * dpr);

    // Рисуем в координатах CSS-пикселей (движок оперирует ими),
    // а браузер сам масштабирует в device-пиксели.
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  window.canvas = canvas;
  window.ctx = ctx;
})();
