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

  // Отключаем сглаживание при масштабировании, чтобы текстуры не "мыло".
  ctx.imageSmoothingEnabled = false;

  // Адаптация под разные разрешения и HiDPI.
  // canvas.width/height задаём в device-пикселях, а логический размер (CSS px)
  // сохраняем отдельно, чтобы движок мог продолжать работать в "нормальных" пикселях.
  const resizeCanvas = () => {
    const sidebarWidth = 200;
    const topOffset = 37;

    // В fullscreen растягиваем canvas на весь экран.
    // В обычном режиме оставляем место под правый сайдбар и небольшой верхний отступ.
    const isFullscreen = !!document.fullscreenElement;

    const cssWidth = Math.max(
      1,
      isFullscreen ? window.innerWidth : window.innerWidth - sidebarWidth,
    );
    const cssHeight = Math.max(
      1,
      isFullscreen ? window.innerHeight : window.innerHeight - topOffset,
    );
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

    // На некоторых браузерах флаг может сбрасываться после setTransform.
    ctx.imageSmoothingEnabled = false;
  };

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  // Fullscreen: кнопка в UI + горячая клавиша F.
  // В fullscreen растягиваем canvas на весь экран.
  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } finally {
      // После переключения fullscreen браузер может поменять размеры,
      // пересчитаем canvas.
      resizeCanvas();
    }
  };

  const fullscreenBtn = document.getElementById('fullscreenBtn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', () => {
      toggleFullscreen();
    });
  }

  window.addEventListener('keydown', (e) => {
    if (e.code === 'KeyF' && !e.repeat) {
      toggleFullscreen();
    }
  });

  document.addEventListener('fullscreenchange', () => {
    resizeCanvas();
  });

  window.canvas = canvas;
  window.ctx = ctx;
})();
