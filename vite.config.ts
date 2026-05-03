import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'node24',
    outDir: 'dist',
    ssr: true,
    minify: 'esbuild',

    rollupOptions: {
      input: 'src/main.ts',
      output: {
        format: 'es',
        entryFileNames: 'index.js',
      },
    },
  },
  resolve: {
    tsconfigPaths: true,
  },
});
