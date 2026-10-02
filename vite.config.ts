import { defineConfig } from 'vitest/config'; // (não de 'vite': é o vitest/config que tipa o campo `test`)
import { VitePWA } from 'vite-plugin-pwa';
import { defineGameBuild } from '@the-inclusionist/engine/build';
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

/* ===================== DOIS ALVOS, DE UMA FONTE SO (ADR-0140 §1), E O SEGUNDO É DA ENGINE (ADR-0253) =====================
 *
 * APP (o padrao) — entrada `app/index.html`, que carrega `src/standalone.ts`. A engine vai EMBUTIDA e o
 * `vite-plugin-pwa` fica ligado. A saida e' um PWA solto, e ele e' a rota de DESENVOLVIMENTO, TESTE,
 * AUDITORIA e DEMONSTRACAO deste repositorio — nunca de entrega (ADR-0140 §3).
 *
 * CARTUCHO (`--mode cartridge`) — entrada `src/index.ts`, cujo export PADRAO e' o cartucho. Quem o monta e'
 * o `defineGameBuild` da engine, sobre ESTA MESMA config: tira o service worker, poe a engine, o PixiJS e o
 * zdog de fora, escreve `dist-lib/cartridge.js` e emite `dist-lib/cartridge.d.ts`.
 *
 * 🔴 ATE 02/10 ESTE FICHEIRO TINHA O SEU PROPRIO RAMO `--mode lib`, e era exatamente o que o ADR-0253 tirou
 * dos jogos: «two targets written by hand in each game drift». O CI partilhado corre `vite build --mode
 * cartridge` e `npx inclusionist-check-cartridge` sem entrada para desligar; um ramo proprio construia um
 * `dist-lib/index.js` que o checador nem procura.
 *
 * ⚠️ O `@mintplex-labs/piper-tts-web` SAIU DA LISTA DE EXTERNOS porque sai do cartucho: a voz neural da
 * engine 11 e' o Kokoro, pedido por `uses: { neuralVoice: true }` (ADR-0216), e a raiz deixou de abrir a
 * porta do Piper. Se um import dele sobrevivesse, este build embutiria o chunk — e o checador diria.
 */
export default defineGameBuild({ cartridge: 'src/index.ts', config: defineConfig({
  root: 'app',
  /*
   * O CAMINHO SOB A ORIGEM, por `--base` ou pelo ambiente (Cloudflare Pages/Build).
   *
   * ⚠️ EM DEV FICA `'/'` E EM PRODUCAO `'/game-platformer/'`, e a diferenca e' deliberada: o `vite dev` serve
   * a raiz da origem, e um `base` com prefixo faria o `assets/*` falhar; o build para o Cloudflare serve o jogo
   * em `o-inclusionista.jrocha.dev.br/game-platformer/`, e sem o prefixo as referencias absolutas quebrariam.
   *
   * 📌 A ENGINE RESOLVE O `/heavy/*` CONTRA O `document.baseURI` (`platform/heavy.js:178`, `base: doc.baseURI`
   * em `boot/create-game.js:3423`), entao o `heavy/*` cai em `/game-platformer/heavy/*` sozinho — a Pages
   * Function de `functions/heavy/[[path]].ts` reencaminha para o R2 partilhado por todos os jogos.
   */
  base: process.env.INCL_BASE || '/',
  define: { __BUILD__: JSON.stringify(BUILD) },
  plugins: [
    atlasDeSprites({ raizSprites: RAIZ_SPRITES }),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,woff2,json}'], maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 },
      // ⚠️ OS CAMPOS ABAIXO SÃO DECLARADOS PORQUE A AUSÊNCIA NÃO ERA SILÊNCIO (ADR-0140). O bloco não
      // dizia `lang` nem `scope`, e o plugin preenchia-os: o manifesto GERADO saía com `"lang":"en"` e
      // `"scope":"/"`. Não declarar é deixar outra pessoa decidir, e aqui as duas decisões estavam erradas.
      manifest: {
        name: 'The Inclusionist',
        short_name: 'Inclusionist',
        // O PRODUTO É EM PORTUGUÊS DO BRASIL, e este campo é o que a tecnologia assistiva lê para escolher a
        // voz. Com `en` um leitor de tela anuncia «Colete 10 moedas» com fonemas ingleses a quem está a
        // aprender a ler — que é exatamente a criança deste jogo.
        lang: 'pt-BR',
        dir: 'ltr',
        // RELATIVO, e não `/`. O padrão do plugin reclamava a ORIGEM INTEIRA: qualquer outra coisa servida no
        // mesmo domínio passava a cair dentro do alcance deste service worker. Sob o ADR-0117 a origem é da
        // plataforma e não de um jogo, então reclamá-la é a afirmação errada mesmo enquanto nada mais lá
        // está. `./` resolve-se contra o próprio manifesto e acompanha o ponto onde o build for servido.
        scope: './',
        // A IDENTIDADE, e ela existe para o navegador saber que uma instalação NOVA é a mesma aplicação. Sem
        // ela a identidade é o `start_url`, e mudar o `start_url` um dia criaria uma segunda instalação ao
        // lado da que a criança já tinha, com os dados dela do outro lado.
        id: './',
        // EM PORTUGUÊS PELO MESMO MOTIVO DO `lang`. Vinha do `description` do package.json — inglês, como
        // manda a convenção para ARTEFATOS — e aparecia na loja de aplicações do aparelho, que é produto e
        // não artefato. Inglês anunciado como pt-BR é a incoerência que o `lang` acima existe para acabar.
        description: 'Jogo de plataforma em pixel art, pensado desde o início para quem joga com leitor de tela, com um só botão, com o teclado ou com a cadeira de rodas.',
        display: 'standalone',
        background_color: '#0b1020',
        theme_color: '#0b1020',
      },
    }),
  ],
  build: { outDir: '../dist', emptyOutDir: true },
  test: {
    // ⚠️ A ENGINE TEM DE SER PROCESSADA PELO VITEST, e não externalizada como qualquer `node_modules` —
    // e a declaração vai DENTRO de cada project, porque eles não herdam a config do topo (o mesmo que este
    // ficheiro já regista para os plugins). Pô-la só aqui em cima não fez efeito nenhum.
    //
    // Achado na separação do cartucho (issue #111): `recycling-tex.node.test.js` faz `vi.mock('pixi.js')`
    // para poder ir da textura de volta ao bitmap, e o mock deixou de alcançar o módulo sob teste no
    // instante em que ele passou a vir de `node_modules/@the-inclusionist/engine`. O Vitest não instrumenta
    // dependências externas por omissão, então o módulo carregava o PixiJS de verdade e estourava com
    // `Unrecognized source type to auto-detect Resource`.
    //
    // ⚠️ Isto vale para QUALQUER consumidor que teste contra a engine, e é uma diferença real entre consumir
    // por `file:` — onde o código está na árvore e é instrumentado — e consumir pelo PACOTE.
    projects: [
      {
        test: {
          name: 'node', environment: 'node', include: ['tests/**/*.node.test.{js,ts}'],
          server: { deps: { inline: [/@the-inclusionist[\\/]engine/] } },
        },
        root: import.meta.dirname,
        plugins: [atlasDeSprites({ raizSprites: RAIZ_SPRITES })],
      },
      {
        test: {
          name: 'browser',
          include: ['tests/**/*.browser.test.{js,ts}'],
          browser: { enabled: true, provider: playwright(), headless: true, instances: [{ browser: 'chromium' }] },
          server: { deps: { inline: [/@the-inclusionist[\\/]engine/] } },
        },
        root: import.meta.dirname,
        plugins: [atlasDeSprites({ raizSprites: RAIZ_SPRITES })],
      },
    ],
  },
}) });
