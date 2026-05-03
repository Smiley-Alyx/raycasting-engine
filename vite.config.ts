import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  // GitHub Pages serves the app under /<repo>/.
  // Build with `vite build --mode gh-pages` to enable it.
  const base = mode === 'gh-pages' ? '/raycasting-engine/' : '/';

  return {
    base,
  };
});
