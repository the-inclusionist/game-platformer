import { defineConfig } from 'vitest/config'; // (não de 'vite': é o vitest/config que tipa o campo `test`)
import { VitePWA } from 'vite-plugin-pwa';
import { playwright } from '@vitest/browser-playwright';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
// O plugin do atlas VEIO COM O CARTUCHO, e isso não é descuido de arrumação: ele gera `virtual:sprite-atlas`,
// que só `render/sprites` importa — e `render/sprites` é o ÚNICO dos 90 módulos usados aqui que o pacote da
// engine NÃO entrega. O `tsconfig.pkg.json` de lá exclui-o por escrito, porque «publicá-lo entregaria ao
// consumidor um import que não resolve». A exclusão estava certa; o lugar dele é este.
import atlasDeSprites from './scripts/vite-plugin-atlas.mjs';

const sh = (cmd: string): string => { try { return execSync(cmd, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim(); } catch { return ''; } };
const cfSha = (process.env.CF_PAGES_COMMIT_SHA || '').slice(0, 7);
const RAIZ_REPO = dirname(fileURLToPath(import.meta.url));
const RAIZ_SPRITES = join(RAIZ_REPO, 'app/public/assets/sprites/menino');
const versaoDoPacote = ((): string => {
  try { return String(JSON.parse(readFileSync(join(RAIZ_REPO, 'package.json'), 'utf8')).version || ''); } catch { return ''; }
})();
const descricaoGit = sh('git describe --tags --always --dirty');
const shaCurto = sh('git rev-parse --short HEAD') || cfSha || 'dev';
/** `0.1.0` num build de release; `0.1.0+abc1234` adiante dela; `-dirty` com árvore suja. */
const versaoDeExibicao = ((): string => {
  if (!versaoDoPacote) return descricaoGit || cfSha || 'dev';
  if (descricaoGit === 'v' + versaoDoPacote) return versaoDoPacote;
  const sujo = descricaoGit.endsWith('-dirty') ? '-dirty' : '';
  return versaoDoPacote + '+' + shaCurto + sujo;
})();
const BUILD = {
  version: versaoDeExibicao,
  sha: shaCurto,
  date: sh('git log -1 --format=%cd --date=short') || '',
  env: process.env.CF_PAGES ? 'prod' : 'local',
};

export default defineConfig({
  root: 'app',
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    atlasDeSprites({ raizSprites: RAIZ_SPRITES }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2,json}'], maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 },
      manifest: {
        name: 'The Inclusionist',
        short_name: 'Inclusionist',
        start_url: '.',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
      },
    }),
  ],
  build: { outDir: '../dist', emptyOutDir: true },
  test: {
    projects: [
      {
        test: { name: 'node', environment: 'node', include: ['tests/**/*.node.test.{js,ts}'] },
        root: import.meta.dirname,
        plugins: [atlasDeSprites({ raizSprites: RAIZ_SPRITES })],
      },
      {
        test: {
          name: 'browser',
          include: ['tests/**/*.browser.test.{js,ts}'],
          browser: { enabled: true, provider: playwright(), headless: true, instances: [{ browser: 'chromium' }] },
        },
        root: import.meta.dirname,
        plugins: [atlasDeSprites({ raizSprites: RAIZ_SPRITES })],
      },
    ],
  },
});
