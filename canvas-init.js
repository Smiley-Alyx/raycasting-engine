(() => {
  const host = document.getElementById('canvas1');
  if (!host) {
    throw new Error('Missing #canvas1 element');
  }

  const canvas = document.createElement('canvas');
  canvas.id = 'canvas';

  const width = window.innerWidth;
  const height = window.innerHeight;
  canvas.width = width - 200;
  canvas.height = height - 37;

  host.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2d context');
  }

  window.canvas = canvas;
  window.ctx = ctx;
})();
