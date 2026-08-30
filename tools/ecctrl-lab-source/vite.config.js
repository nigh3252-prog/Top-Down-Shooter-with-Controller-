import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const licenseBanner = `/*!
 * Ecctrl
 * https://github.com/pmndrs/ecctrl
 *
 * SPDX-FileCopyrightText: 2023-2026 Erdong Chen
 * SPDX-License-Identifier: MIT
 */`;

const preserveEcctrlLicense = () => ({
  name: 'preserve-ecctrl-license',
  enforce: 'post',
  generateBundle(_options, bundle) {
    for (const artifact of Object.values(bundle)) {
      if (artifact.type !== 'chunk' || artifact.code.startsWith(licenseBanner)) continue;
      artifact.code = `${licenseBanner}\n${artifact.code}`;
    }
  },
});

export default defineConfig({
  base: './',
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
  plugins: [react(), preserveEcctrlLicense()],
  publicDir: 'public',
  build: {
    outDir: '../ecctrl-lab',
    emptyOutDir: true,
    sourcemap: false,
    target: 'es2020',
    lib: {
      entry: fileURLToPath(new URL('./src/entry.jsx', import.meta.url)),
      formats: ['es'],
      fileName: () => 'assets/ecctrl-lab.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: artifact => artifact.name?.endsWith('.css')
          ? 'assets/ecctrl-lab.css'
          : 'assets/[name]-[hash][extname]',
      },
    },
  },
});
